/**
 * Where-Fragment, das alte v1-Magazin-Wurzel-Einträge ausblendet.
 *
 * Hintergrund: Bei der v1-Migration (siehe `import.ts`, else-Zweig im
 * Magazine-Loop) wird für jedes Magazin OHNE konkrete Heft-Deadlines
 * trotzdem ein Competition-Eintrag angelegt. Diese Einträge sind
 * keine echten Ausschreibungen, sondern repräsentieren das Magazin
 * selbst — sie blähen die Triage / Entdecken-Listen unnötig auf.
 *
 * Identifikation:
 *  - type = ZEITSCHRIFT
 *  - magazineId IS NOT NULL (mit Magazine-Record verknüpft)
 *  - theme IS NULL (echte Heft-Ausschreibungen haben immer ein Thema)
 *
 * Diese Einträge bleiben in der DB (für /zeitschriften, Statistiken),
 * werden aber aus den "Ausschreibungen"-Listen rausgehalten.
 */
export const excludeMagazineRoots = {
  NOT: {
    AND: [
      { type: 'ZEITSCHRIFT' as const },
      { magazineId: { not: null } },
      { theme: null },
    ],
  },
}
