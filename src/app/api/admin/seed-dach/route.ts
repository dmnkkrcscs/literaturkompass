/**
 * POST /api/admin/seed-dach?token=LitKompass2026!update
 *
 * Importiert alle Wettbewerbe, Anthologien und Zeitschriften aus der
 * Quelldatei „Literaturwettbewerbe_DACH_2026_2027.md" direkt in die DB.
 * Idempotent: bestehende Einträge werden per upsert aktualisiert.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'LitKompass2026!update'

// ─── Hilfsfunktion: eindeutige URL ────────────────────────────────────────────

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äöüÄÖÜ]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', Ä: 'Ae', Ö: 'Oe', Ü: 'Ue' }[c] || c))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

// ─── Plattformen als Crawl-Quellen ────────────────────────────────────────────

const PLATFORMS = [
  { name: 'autorenwelt.de – Förderungen', url: 'https://www.autorenwelt.de/verzeichnis/foerderungen' },
  { name: 'literaturcafe.de – Schreibwettbewerbe', url: 'https://www.literaturcafe.de/rubrik/schreibwettbewerbe/' },
  { name: 'Literaturport – Preise & Stipendien', url: 'https://www.literaturport.de/preise-stipendien/' },
  { name: 'kreativ-schreiben-lernen.de – Wettbewerbe', url: 'https://kreativ-schreiben-lernen.de/wettbewerbe-preise-etc/' },
  { name: 'Wortmagier – Ausschreibungen', url: 'https://www.wortmagier.de/ausschreibungen-wettbewerbe.html' },
  { name: 'Treffpunkt Schreiben (AT) – Wettbewerbe', url: 'https://treffpunktschreiben.at/wettbewerbe/' },
  { name: 'Geest-Verlag – Ausschreibungen', url: 'https://geest-verlag.de/ausschreibungen' },
  { name: 'Papierfresserchen Verlag', url: 'https://www.papierfresserchen.eu/' },
  { name: 'PAN – Wir erschaffen Welten (Fantasy/SciFi)', url: 'https://wir-erschaffen-welten.net/aktivitaeten/aktuelle-ausschreibungen/' },
  { name: 'Literaturportal Bayern', url: 'https://www.literaturportal-bayern.de/' },
  { name: 'AdS Schweiz – Ausschreibungen', url: 'https://www.a-d-s.ch/foerderungen/ausschreibungen/' },
  { name: 'IG Autorinnen Autoren (AT) – Zeitschriften', url: 'https://igautorinnenautoren.at/service/listen-links/literaturzeitschriften' },
  { name: 'Kulturpreise.de', url: 'https://www.kulturpreise.de/' },
  { name: 'Deutscher Literaturfonds', url: 'https://deutscher-literaturfonds.de/' },
  { name: 'Bachmannpreis – Klagenfurt', url: 'https://bachmannpreis.orf.at/' },
  { name: 'Papierfresserchen – Aktuelle Anthologien', url: 'https://www.papierfresserchen.eu/anthologien/' },
  { name: 'Schreiblust Verlag – Wettbewerbstipps', url: 'https://schreiblust-verlag.de/wettbewerbstipps' },
  { name: 'OpenNet – Solothurner Literaturtage', url: 'https://www.literatur.ch/de/opennet/ausschreibung/' },
]

// ─── Wettbewerbe ──────────────────────────────────────────────────────────────
// url: eindeutige kanonische URL oder intern generierte ID-URL

const COMPETITIONS = [
  // ── WETTBEWERBE ─────────────────────────────────────────────────────────────
  {
    name: 'W.-G.-Sebald-Literaturpreis 2026',
    organizer: 'Deutsche Sebald Gesellschaft e.V.',
    type: 'WETTBEWERB' as const,
    deadline: new Date('2026-04-30'),
    theme: 'Erinnerung und Gedächtnis',
    genres: ['Prosa'],
    prize: '10.000 €',
    maxLength: '30000 Zeichen',
    url: 'https://www.sebald-gesellschaft.de/literaturpreis/',
    description: 'Unveröffentlichter deutschsprachiger Prosatext (max. 30.000 Zeichen). Mindestens eine vorliegende literarische Publikation erforderlich. Anonymisiert als PDF einreichen.',
  },
  {
    name: 'Preis der Gruppe 48 2026',
    organizer: 'Gruppe 48 e.V.',
    type: 'WETTBEWERB' as const,
    deadline: new Date('2026-04-15'),
    theme: null,
    genres: ['Prosa', 'Lyrik'],
    prize: '10.000 € (gesamt: Jurypreis je 2.500 €, Publikumspreis je 1.000 €)',
    maxLength: null,
    url: 'https://www.die-gruppe-48.net/',
    description: 'Prosa und Lyrik, kein vorgegebenes Thema. Finale: 13. September 2026, Schloss Eulenbroich, Rösrath.',
  },
  {
    name: 'EXIL-Literaturpreise 2026 „Schreiben zwischen den Kulturen"',
    organizer: 'Edition Exil / Amerlinghaus Wien',
    type: 'WETTBEWERB' as const,
    deadline: new Date('2026-04-30'),
    theme: 'Schreiben zwischen den Kulturen',
    genres: ['Prosa', 'Lyrik', 'Drama'],
    prize: 'Prosa: 3.000 € / 2.000 € / 1.500 €, Lyrik: 1.500 €',
    maxLength: null,
    url: 'https://amerlinghaus.at/jetzt-einreichen-exil-literaturpreise-2026/',
    description: 'Seit mind. 6 Monaten in Österreich wohnhaft. Unveröffentlichte deutschsprachige Texte. Einreichung an verein.exil@inode.at. Preisverleihung Dezember 2026 im Literaturhaus Wien.',
  },
  {
    name: 'Wettbewerb „Im Stillen"',
    organizer: null,
    type: 'WETTBEWERB' as const,
    deadline: new Date('2026-05-10'),
    theme: 'Im Stillen',
    genres: ['Lyrik', 'Prosa'],
    prize: null,
    maxLength: null,
    url: 'https://literaturkompass.internal/dach2026/im-stillen',
    description: 'Thema: Im Stillen. Lyrik und Prosa. Details auf einschlägigen Ausschreibungsportalen.',
  },
  {
    name: '36. open mike – Wettbewerb für junge Literatur 2026',
    organizer: 'Haus für Poesie, Berlin',
    type: 'WETTBEWERB' as const,
    deadline: new Date('2026-05-20'),
    theme: null,
    genres: ['Prosa', 'Lyrik'],
    prize: '7.500 € (gesamt)',
    maxLength: null,
    url: 'https://www.hausfuerpoesie.org/',
    description: 'Unter 35 Jahre, noch keine eigene Buchpublikation. Open Call: 20. April – 20. Mai 2026. Finale: 14. November 2026, Amerika-Gedenkbibliothek Berlin.',
  },
  {
    name: 'Nora-Pfeffer-Literaturpreis 2026',
    organizer: 'Bayerisches Kulturzentrum der Deutschen aus Russland (BKDR)',
    type: 'WETTBEWERB' as const,
    deadline: new Date('2026-04-15'),
    theme: null,
    genres: ['Lyrik', 'Kurzgeschichte', 'Essay'],
    prize: '900 € gesamt (je 300 € für Lyrik, Kurzgeschichte, Essay)',
    maxLength: 'max. 10 Gedichte',
    url: 'https://bkdr.de/nora-pfeffer-literaturpreis-2026/',
    description: 'Bis 40 Jahre (Jahrgang 1986 oder jünger). Unveröffentlichte deutschsprachige Texte. Einreichung: redaktion@bkdr.de. Preisverleihung Herbst 2026 in Nürnberg.',
  },
  {
    name: 'Bodensee-Literaturwettbewerb 2026 – „Zwischenwelten"',
    organizer: null,
    type: 'WETTBEWERB' as const,
    deadline: new Date('2026-06-30'),
    theme: 'Zwischenwelten',
    genres: ['Prosa'],
    prize: '500 € / 300 € / 200 €',
    maxLength: '4500 Zeichen',
    url: 'https://literaturkompass.internal/dach2026/bodensee-wettbewerb-2026',
    description: 'Wohnsitz in der Bodenseeregion (D/A/CH), Oberschwaben oder Allgäu. Prosa max. 4.500 Zeichen.',
  },
  {
    name: '„Krimi am Hof" 2026 (Steiermark)',
    organizer: 'Markt Hartmannsdorf, Oststeiermark',
    type: 'WETTBEWERB' as const,
    deadline: new Date('2026-05-15'),
    theme: null,
    genres: ['Krimi'],
    prize: null,
    maxLength: null,
    url: 'https://literaturkompass.internal/dach2026/krimi-am-hof-2026',
    description: 'Krimigeschichten. Ort: Markt Hartmannsdorf, Oststeiermark.',
  },
  {
    name: 'Lyrikpreis München 2027',
    organizer: 'APHAIA Verlag / Signaturen-Magazin',
    type: 'WETTBEWERB' as const,
    deadline: new Date('2027-01-03'),
    theme: 'Dürers Melencolia I und die Gravur der Gegenwart',
    genres: ['Lyrik'],
    prize: '15.000 €',
    maxLength: null,
    url: 'http://lyrikpreis-muenchen.com/teilnehmen.html',
    description: 'Lyrik (Textlänge frei), unveröffentlicht. Einreichung mit Kurzbiografie an info@lyrikpreis-muenchen.com. Bekanntgabe Sommer 2027, Preisverleihung Q4 2027 München.',
  },
  {
    name: 'Ingeborg-Bachmann-Preis 2026 (Klagenfurt)',
    organizer: 'ORF-Landesstudio Kärnten',
    type: 'WETTBEWERB' as const,
    deadline: new Date('2026-02-28'),
    theme: null,
    genres: ['Prosa'],
    prize: '25.000 €',
    maxLength: '25 Minuten Lesedauer',
    url: 'https://bachmannpreis.orf.at/',
    description: '50. Jubiläum & 100. Geburtstag Ingeborg Bachmanns. Einladung durch Jury-Mitglieder erforderlich. Unveröffentlichte deutschsprachige Prosa (max. 25 Min.). Veranstaltung: 24.–28. Juni 2026.',
  },
  {
    name: 'Arbeitsstipendien Deutscher Literaturfonds 2026',
    organizer: 'Deutscher Literaturfonds e.V.',
    type: 'WETTBEWERB' as const,
    deadline: new Date('2026-03-31'),
    theme: null,
    genres: ['Prosa', 'Lyrik', 'Drama', 'Essay'],
    prize: '3.000 € / Monat (max. 1 Jahr)',
    maxLength: null,
    url: 'https://www.literaturport.de/preise-stipendien/preisdetails/arbeitsstipendien-fuer-autorinnen-des-deutschen-literaturfonds-ev/',
    description: 'Stipendium für Autor:innen. 3.000 € pro Monat, max. 1 Jahr.',
  },
  {
    name: 'Hans-Weigel-Literaturstipendium Niederösterreich 2026',
    organizer: 'Land Niederösterreich',
    type: 'WETTBEWERB' as const,
    deadline: new Date('2026-03-31'),
    theme: null,
    genres: ['Alle Gattungen'],
    prize: '2 × 12.000 € pro Jahr',
    maxLength: null,
    url: 'https://www.noe.gv.at/noe/Kunst-Kultur/Literaturstipendien.html',
    description: 'Einreichzeitraum: 1.–31. März jährlich. Einreichung: post.k1@noel.gv.at.',
  },
  {
    name: 'LCB-Aufenthaltsstipendien für junge Autor:innen',
    organizer: 'Literarisches Colloquium Berlin',
    type: 'WETTBEWERB' as const,
    deadline: null,
    theme: null,
    genres: ['Alle Gattungen'],
    prize: '1.100 € / Monat (bis 3 Monate)',
    maxLength: null,
    url: 'https://lcb.de/foerderung/aufenthaltsstipendien-fuer-junge-deutschsprachige-autorinnen-und-autoren/',
    description: 'Unter 35 Jahre, nicht in Berlin wohnhaft, mind. eine literarische Publikation. Bewerbungszeitraum: August–September für Folgejahr.',
  },
  {
    name: 'OpenNet – Solothurner Literaturtage',
    organizer: 'Solothurner Literaturtage',
    type: 'WETTBEWERB' as const,
    deadline: null,
    theme: null,
    genres: ['Prosa'],
    prize: null,
    maxLength: null,
    url: 'https://www.literatur.ch/de/opennet/ausschreibung/',
    description: 'Wohnsitz in der Schweiz, noch keine eigene literarische Buchpublikation. Prosa auf Deutsch, Französisch, Italienisch oder Rätoromanisch.',
  },

  // ── ANTHOLOGIEN ─────────────────────────────────────────────────────────────
  {
    name: '„JOY – Was uns jetzt Hoffnung macht" (btb Verlag)',
    organizer: 'btb Verlag (Penguin Random House)',
    type: 'ANTHOLOGIE' as const,
    deadline: new Date('2026-04-15'),
    theme: 'Was uns jetzt Hoffnung macht',
    genres: ['Kurzgeschichte'],
    prize: null,
    maxLength: null,
    url: 'https://literaturkompass.internal/dach2026/joy-btb-verlag',
    description: 'Kurzgeschichten. Veröffentlichung: Frühjahr 2027 im btb Verlag (Penguin Random House).',
  },
  {
    name: 'Papierfresserchen – „Traumsilhouette"',
    organizer: 'Papierfresserchen Verlag',
    type: 'ANTHOLOGIE' as const,
    deadline: null,
    theme: 'Träume – nächtliche Träume, Tagträume, Sehnsüchte, Traumlandschaften',
    genres: ['Erzählung', 'Märchen', 'Kurzgeschichte', 'Lyrik'],
    prize: null,
    maxLength: null,
    url: 'https://www.papierfresserchen.eu/anthologien/traumsilhouette/',
    description: 'Erscheinung: Sommer 2026. Autor:innen ab 16 Jahren.',
  },
  {
    name: 'Papierfresserchen – „Versteckt in Stein und Zeit"',
    organizer: 'Papierfresserchen Verlag',
    type: 'ANTHOLOGIE' as const,
    deadline: null,
    theme: 'Verborgene Orte, vergessene Übergänge, fantastische Kurzgeschichten',
    genres: ['Kurzgeschichte', 'Fantastik'],
    prize: null,
    maxLength: null,
    url: 'https://www.papierfresserchen.eu/anthologie-reihen/versteckt-in-stein-und-zeit/',
    description: 'Erscheinung: Herbst 2026.',
  },
  {
    name: 'Papierfresserchen – „Meine Berge … und ich"',
    organizer: 'Papierfresserchen Verlag',
    type: 'ANTHOLOGIE' as const,
    deadline: null,
    theme: 'Bergwelten und persönliche Erfahrungen',
    genres: ['Erzählung', 'Kurzgeschichte', 'Lyrik'],
    prize: null,
    maxLength: null,
    url: 'https://www.papierfresserchen.eu/anthologie-reihen/meine-berge-und-ich/',
    description: 'Bergwelten und persönliche Erfahrungen.',
  },
  {
    name: 'Papierfresserchen – „Das Buch der vergessenen Geschichten"',
    organizer: 'Papierfresserchen Verlag',
    type: 'ANTHOLOGIE' as const,
    deadline: null,
    theme: 'Vergessene Geschichten',
    genres: ['Erzählung', 'Märchen', 'Kurzgeschichte'],
    prize: null,
    maxLength: null,
    url: 'https://www.papierfresserchen.eu/anthologie-reihen/buch-der-vergessenen-geschichten/',
    description: 'Laufende Anthologie-Ausschreibung des Papierfresserchen Verlags.',
  },
  {
    name: 'Papierfresserchen – „Das Meer und ich"',
    organizer: 'Papierfresserchen Verlag',
    type: 'ANTHOLOGIE' as const,
    deadline: null,
    theme: 'Das Meer und persönliche Erfahrungen',
    genres: ['Erzählung', 'Kurzgeschichte', 'Lyrik'],
    prize: null,
    maxLength: null,
    url: 'https://www.papierfresserchen.eu/anthologie-reihen/und-ich-das-meer/',
    description: 'Laufende Anthologie-Ausschreibung des Papierfresserchen Verlags.',
  },
  {
    name: 'Papierfresserchen – „Die Krimizimmerei"',
    organizer: 'Papierfresserchen Verlag',
    type: 'ANTHOLOGIE' as const,
    deadline: null,
    theme: 'Krimigeschichten',
    genres: ['Krimi'],
    prize: null,
    maxLength: null,
    url: 'https://www.papierfresserchen.eu/anthologie-reihen/die-krimizimmerei/',
    description: 'Krimianthologie des Papierfresserchen Verlags.',
  },
  {
    name: 'Anthologie zum Thema „Pflege" (Lyrik)',
    organizer: null,
    type: 'ANTHOLOGIE' as const,
    deadline: new Date('2026-04-30'),
    theme: 'Pflege',
    genres: ['Lyrik'],
    prize: '225 € gesamt + Veröffentlichung',
    maxLength: null,
    url: 'https://literaturkompass.internal/dach2026/anthologie-pflege-lyrik',
    description: 'Lyrische Texte zum Thema Pflege. Geldpreise im Gesamtwert von 225 € + Veröffentlichung in Anthologie und E-Book.',
  },
  {
    name: 'Hommage an Harry Houdini (100. Todestag 2026)',
    organizer: null,
    type: 'ANTHOLOGIE' as const,
    deadline: null,
    theme: 'Hommage an Houdini',
    genres: ['Kurzgeschichte', 'Lyrik'],
    prize: null,
    maxLength: null,
    url: 'https://literaturkompass.internal/dach2026/houdini-hommage-2026',
    description: 'Geschichten und Gedichte als Hommage an Harry Houdini anlässlich seines 100. Todestags 2026. Stil: spannend, lustig, tragisch-komisch.',
  },
  {
    name: 'Geest-Verlag – Anthologie „Jetzt ist Sense"',
    organizer: 'Geest-Verlag',
    type: 'ANTHOLOGIE' as const,
    deadline: null,
    theme: 'Tod',
    genres: ['Kurzgeschichte', 'Lyrik', 'Erzählung'],
    prize: null,
    maxLength: null,
    url: 'https://geest-verlag.de/ausschreibungen',
    description: 'Anthologie zum Thema Tod. Details auf geest-verlag.de/ausschreibungen.',
  },

  // ── ZEITSCHRIFTEN ───────────────────────────────────────────────────────────
  {
    name: 'manuskripte – Zeitschrift für Literatur (Graz)',
    organizer: 'Forum Stadtpark / manuskripte',
    type: 'ZEITSCHRIFT' as const,
    deadline: null,
    theme: null,
    genres: ['Prosa', 'Lyrik', 'Essay', 'Drama'],
    prize: null,
    maxLength: null,
    url: 'https://www.manuskripte.at/wordpress/',
    description: 'Seit 1960 eine der wichtigsten deutschsprachigen Literaturzeitschriften. Manuskripte jederzeit einreichbar.',
  },
  {
    name: 'mosaik – Zeitschrift für Literatur und Kultur (Salzburg)',
    organizer: 'Edition mosaik',
    type: 'ZEITSCHRIFT' as const,
    deadline: null,
    theme: null,
    genres: ['Prosa', 'Lyrik', 'Essay'],
    prize: null,
    maxLength: null,
    url: 'https://www.mosaikzeitschrift.at/ueber/einsendungen/',
    description: 'Jederzeit digital einsendbar an schreib@edition-mosaik.at (*.doc, *.docx, *.odt oder PDF).',
  },
  {
    name: 'erostepost – Ausgabe #71 (Redaktionsschluss 1.4.2026)',
    organizer: 'erostepost',
    type: 'ZEITSCHRIFT' as const,
    deadline: new Date('2026-04-01'),
    theme: null,
    genres: ['Prosa', 'Lyrik'],
    prize: null,
    maxLength: null,
    url: 'https://literaturkompass.internal/dach2026/erostepost-71',
    description: 'Deutschsprachige Texteinsendungen. Redaktionsschluss Ausgabe #71: 1. April 2026. Einreichung an einsendung@erostepost.at.',
  },
  {
    name: 'Lichtungen – Zeitschrift für Literatur, Kunst und Zeitkritik (Graz)',
    organizer: 'Lichtungen',
    type: 'ZEITSCHRIFT' as const,
    deadline: null,
    theme: null,
    genres: ['Prosa', 'Lyrik', 'Essay'],
    prize: null,
    maxLength: null,
    url: 'https://lichtungen.at/',
    description: 'Grazer Zeitschrift für Literatur, Kunst und Zeitkritik. Manuskripte einreichbar.',
  },
  {
    name: 'kolik – Zeitschrift für Literatur (Wien)',
    organizer: 'kolik',
    type: 'ZEITSCHRIFT' as const,
    deadline: null,
    theme: null,
    genres: ['Prosa', 'Lyrik'],
    prize: null,
    maxLength: null,
    url: 'https://kolik.at/',
    description: 'Wiener Zeitschrift für Literatur. Einsendungen möglich.',
  },
  {
    name: 'BELLA triste – Zeitschrift für junge deutschsprachige Literatur',
    organizer: 'BELLA triste',
    type: 'ZEITSCHRIFT' as const,
    deadline: null,
    theme: null,
    genres: ['Prosa', 'Lyrik', 'Essay'],
    prize: null,
    maxLength: null,
    url: 'https://www.bellatriste.de/',
    description: 'Zeitschrift für junge deutschsprachige Literatur, Lyrik, Essays. Einsendungen möglich.',
  },
  {
    name: 'Sinn und Form (Akademie der Künste, Berlin)',
    organizer: 'Akademie der Künste, Berlin',
    type: 'ZEITSCHRIFT' as const,
    deadline: null,
    theme: null,
    genres: ['Prosa', 'Lyrik', 'Essay'],
    prize: null,
    maxLength: null,
    url: 'https://sinnundform.de/',
    description: 'Traditionsreiche Zeitschrift der Akademie der Künste. Manuskripte einreichbar.',
  },
  {
    name: 'Am Erker – Zeitschrift für Literatur (Münster)',
    organizer: 'Am Erker',
    type: 'ZEITSCHRIFT' as const,
    deadline: null,
    theme: null,
    genres: ['Prosa', 'Lyrik'],
    prize: null,
    maxLength: null,
    url: 'https://am-erker.de/',
    description: 'Münsteraner Zeitschrift für Literatur. Einsendungen möglich.',
  },
  {
    name: 'Orte – Schweizer Literaturzeitschrift',
    organizer: 'Orte',
    type: 'ZEITSCHRIFT' as const,
    deadline: null,
    theme: null,
    genres: ['Prosa', 'Lyrik'],
    prize: null,
    maxLength: null,
    url: 'https://orte.ch/',
    description: 'Schweizer Literaturzeitschrift. Manuskripte einreichbar.',
  },
]

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (token !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = { competitions: 0, sources: 0, errors: [] as string[] }

  // 1. Haupt-Quelle für manuell importierte DACH-Daten anlegen
  const manualSource = await db.source.upsert({
    where: { url: 'https://literaturkompass.internal/dach-recherche-2026' },
    update: { name: 'DACH Grundrecherche 2026', isActive: true },
    create: {
      name: 'DACH Grundrecherche 2026',
      url: 'https://literaturkompass.internal/dach-recherche-2026',
      type: 'MANUAL',
      isActive: true,
    },
  })

  // 2. Crawl-Plattformen als Quellen anlegen
  for (const platform of PLATFORMS) {
    try {
      await db.source.upsert({
        where: { url: platform.url },
        update: { name: platform.name, isActive: true },
        create: { name: platform.name, url: platform.url, type: 'AGGREGATOR', isActive: true },
      })
      results.sources++
    } catch (e) {
      results.errors.push(`Quelle "${platform.name}": ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // 3. Wettbewerbe / Anthologien / Zeitschriften anlegen
  for (const comp of COMPETITIONS) {
    try {
      await db.competition.upsert({
        where: { url: comp.url },
        update: {
          name: comp.name,
          organizer: comp.organizer,
          type: comp.type,
          deadline: comp.deadline,
          theme: comp.theme,
          genres: comp.genres,
          prize: comp.prize,
          maxLength: comp.maxLength,
          description: comp.description,
        },
        create: {
          name: comp.name,
          organizer: comp.organizer,
          type: comp.type,
          deadline: comp.deadline,
          theme: comp.theme,
          genres: comp.genres,
          prize: comp.prize,
          maxLength: comp.maxLength,
          description: comp.description,
          url: comp.url,
          sourceId: manualSource.id,
          aiExtracted: false,
        },
      })
      results.competitions++
    } catch (e) {
      results.errors.push(`Wettbewerb "${comp.name}": ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return NextResponse.json({
    success: results.errors.length === 0,
    imported: results,
    message: `${results.competitions} Ausschreibungen und ${results.sources} Quellen importiert.${results.errors.length > 0 ? ' Fehler: ' + results.errors.join('; ') : ''}`,
  })
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (token !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({
    ready: true,
    competitions: COMPETITIONS.length,
    platforms: PLATFORMS.length,
    hint: 'POST to this endpoint with ?token=... to import all data.',
  })
}
