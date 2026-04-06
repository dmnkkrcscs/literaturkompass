import { publicProcedure, router } from '../init'
import { db } from '@/lib/db'
import fs from 'fs'
import path from 'path'

function readJson(filename: string): any {
  const filepath = path.join(process.cwd(), 'data', filename)
  if (!fs.existsSync(filepath)) return null
  return JSON.parse(fs.readFileSync(filepath, 'utf8'))
}

function parseDeadline(d: string | null | undefined): Date | null {
  if (!d) return null
  const date = new Date(d)
  return isNaN(date.getTime()) ? null : date
}

function mapType(t: string): 'WETTBEWERB' | 'ANTHOLOGIE' | 'ZEITSCHRIFT' {
  switch (t?.toLowerCase()) {
    case 'anthologie': return 'ANTHOLOGIE'
    case 'zeitschrift': return 'ZEITSCHRIFT'
    default: return 'WETTBEWERB'
  }
}

export const importRouter = router({
  status: publicProcedure.query(async () => {
    const count = await db.competition.count({ where: { source: { url: 'v1-import' } } })
    return { imported: count > 0, count }
  }),

  runV1Import: publicProcedure.mutation(async () => {
    const extractedData = readJson('extracted_data.json')
    const prefs: Record<string, any> = readJson('server_prefs.json') || {}
    const submitted: any[] = readJson('server_submitted.json') || []
    const accepted: any[] = readJson('server_accepted.json') || []
    const manualComps: any[] = readJson('server_manual.json') || []
    const manualMags: any[] = readJson('server_manual_mags.json') || []
    const starredData = readJson('starred.json')
    const starredItems: string[] = starredData?.items?.map((i: any) => i.id) || []

    if (!extractedData) {
      return { success: false, message: 'Keine v1-Daten gefunden (data/extracted_data.json fehlt)' }
    }

    const competitions: any[] = [...(extractedData.competitions || [])]
    const magazines: any[] = [...(extractedData.magazines || [])]

    // Merge manuals
    for (const mc of manualComps) {
      if (!competitions.find((c: any) => c.id === mc.id)) competitions.push(mc)
    }
    for (const mm of manualMags) {
      if (!magazines.find((m: any) => m.id === mm.id)) magazines.push(mm)
    }

    // Build lookup
    const submittedMap = new Map(submitted.map(s => [s.id, s]))
    const acceptedMap = new Map(accepted.map(a => [a.id, a]))

    const source = await db.source.upsert({
      where: { url: 'v1-import' },
      update: {},
      create: { name: 'V1 Import', url: 'v1-import', type: 'MANUAL', isActive: false },
    })

    let created = 0, skipped = 0, subs = 0

    // Import competitions
    for (const comp of competitions) {
      const pref = prefs[comp.id] || {}
      const overrides = pref.overrides || {}
      const url = overrides.url || pref.sourceUrl || comp.url
      if (!url) { skipped++; continue }

      const existing = await db.competition.findFirst({ where: { OR: [{ url }, { legacyId: comp.id }] } })
      if (existing) {
        subs += await maybeCreateSub(existing.id, comp.id, submittedMap, acceptedMap)
        skipped++; continue
      }

      try {
        const c = await db.competition.create({
          data: {
            legacyId: comp.id,
            name: overrides.name || comp.name,
            type: mapType(comp.type),
            organizer: comp.organizer || null,
            deadline: parseDeadline(overrides.deadline || comp.deadline),
            theme: overrides.theme || comp.theme || null,
            genres: comp.genres || [],
            prize: overrides.prize || comp.prize || null,
            maxLength: comp.maxLength || null,
            requirements: overrides.requirements || pref.customRequirements || comp.requirements || null,
            url,
            description: overrides.description || comp.description || null,
            source: { connect: { id: source.id } },
            starred: pref.starred === true || starredItems.includes(comp.id),
            dismissed: pref.dismissed === true,
            ...(pref.starred && { starredAt: new Date() }),
          },
        })
        created++
        subs += await maybeCreateSub(c.id, comp.id, submittedMap, acceptedMap)
      } catch { skipped++ }
    }

    // Import magazines with deadlines
    for (const mag of magazines) {
      const pref = prefs[mag.id] || {}
      const baseUrl = mag.submissionUrl || mag.url
      if (!baseUrl) { skipped++; continue }

      const deadlines = mag.submissionDeadlines || []
      if (deadlines.length > 0) {
        for (const dl of deadlines) {
          const dlId = `${mag.id}-${dl.date}`
          const dlPref = prefs[dlId] || {}
          const dlOverrides = dlPref.overrides || {}
          const uniqueUrl = `${dlOverrides.url || baseUrl}#${dl.date}`

          const existing = await db.competition.findFirst({ where: { legacyId: dlId } })
          if (existing) {
            subs += await maybeCreateSub(existing.id, dlId, submittedMap, acceptedMap)
            skipped++; continue
          }

          try {
            const c = await db.competition.create({
              data: {
                legacyId: dlId,
                name: dlOverrides.name || `${mag.name} – ${dl.theme}`,
                type: 'ZEITSCHRIFT',
                organizer: mag.location || null,
                deadline: parseDeadline(dlOverrides.deadline || dl.date),
                theme: dlOverrides.theme || dl.theme,
                genres: mag.genres || [],
                requirements: dlOverrides.requirements || pref.customRequirements || mag.requirements || null,
                url: uniqueUrl,
                description: dlOverrides.description || mag.description || null,
                source: { connect: { id: source.id } },
                starred: dlPref.starred === true || pref.starred === true || starredItems.includes(dlId),
                dismissed: dlPref.dismissed === true,
              },
            })
            created++
            subs += await maybeCreateSub(c.id, dlId, submittedMap, acceptedMap)
          } catch { skipped++ }
        }
      } else {
        const existing = await db.competition.findFirst({ where: { OR: [{ url: baseUrl }, { legacyId: mag.id }] } })
        if (existing) { skipped++; continue }

        try {
          await db.competition.create({
            data: {
              legacyId: mag.id,
              name: mag.name,
              type: 'ZEITSCHRIFT',
              organizer: mag.location || null,
              deadline: parseDeadline(mag.deadline),
              genres: mag.genres || [],
              requirements: mag.requirements || null,
              url: baseUrl,
              description: mag.description || null,
              source: { connect: { id: source.id } },
              starred: pref.starred === true || starredItems.includes(mag.id),
              dismissed: pref.dismissed === true,
            },
          })
          created++
        } catch { skipped++ }
      }
    }

    return { success: true, message: `${created} importiert, ${subs} Einreichungen, ${skipped} übersprungen` }
  }),
})

async function maybeCreateSub(
  competitionId: string,
  legacyId: string,
  submittedMap: Map<string, any>,
  acceptedMap: Map<string, any>,
): Promise<number> {
  const accData = acceptedMap.get(legacyId)
  const subData = submittedMap.get(legacyId)
  if (!accData && !subData) return 0

  const existing = await db.submission.findFirst({ where: { competitionId } })
  if (existing) return 0

  const data = accData || subData
  await db.submission.create({
    data: {
      competitionId,
      status: accData ? 'ACCEPTED' : 'SUBMITTED',
      title: data.title || null,
      submittedAt: data.date ? new Date(data.date) : new Date(),
      ...(accData && { responseAt: new Date() }),
    },
  })
  return 1
}
