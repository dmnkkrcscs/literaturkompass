/**
 * Where-Fragment, das v1-Magazin-Wurzel-Einträge ausblendet.
 *
 * Hintergrund: Bei der v1-Migration wird für jedes Magazin OHNE konkrete
 * Heft-Deadlines trotzdem ein Competition-Eintrag angelegt. Diese Einträge
 * sind keine echten Ausschreibungen, sondern repräsentieren das Magazin
 * selbst — sie blähen Triage / Entdecken-Listen unnötig auf.
 *
 * Identifikation:
 *  - type = ZEITSCHRIFT
 *  - theme IS NULL (echte Heft-Ausschreibungen haben immer ein Thema)
 *
 * Hinweis: `magazineId` ist hier bewusst KEIN Kriterium — alte
 * v1-Imports (`scripts/import-v1-data.ts`) haben Magazin-Wurzeln
 * angelegt, ohne `magazine: connect` zu setzen, d.h. `magazineId`
 * bleibt dort null. Würden wir das voraussetzen, blieben diese
 * alten Wurzeln (z.B. „Am Erker") in der Triage hängen.
 *
 * Diese Einträge bleiben in der DB (für /zeitschriften, Statistiken),
 * werden aber aus den „Ausschreibungen"-Listen rausgehalten.
 */
export const excludeMagazineRoots = {
  NOT: {
    AND: [
      { type: 'ZEITSCHRIFT' as const },
      { theme: null },
    ],
  },
}
