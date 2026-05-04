/**
 * Prüft, ob die `regionRestriction` eines Wettbewerbs zur User-Profil-
 * Region passt.
 *
 * Regeln:
 *  - Wettbewerb hat keine Restriction (null/leer/whitespace) → passt IMMER
 *  - User hat keine erlaubten Regionen definiert → passt IMMER (kein Filter)
 *  - Sonst: case-insensitive Substring-Match auf einer der erlaubten Regionen
 *
 * Bewusst toleranter Match: "Deutschland, Österreich, Schweiz" enthält
 * "Österreich" → passt. Keine harten Wortgrenzen, weil Restriction-Texte
 * frei formuliert sind ("Aufgewachsen in Niederösterreich" usw.).
 */
export function regionMatches(
  regionRestriction: string | null | undefined,
  allowedRegions: string[],
): boolean {
  if (!regionRestriction || regionRestriction.trim() === '') return true
  if (allowedRegions.length === 0) return true

  const haystack = regionRestriction.toLowerCase()
  return allowedRegions.some(region => {
    const needle = region.trim().toLowerCase()
    return needle.length > 0 && haystack.includes(needle)
  })
}
