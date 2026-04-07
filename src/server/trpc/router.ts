import { router } from './init'
import { competitionRouter } from './routers/competition'
import { submissionRouter } from './routers/submission'
import { sourceRouter } from './routers/source'
import { crawlRouter } from './routers/crawl'
import { aiRouter } from './routers/ai'
import { statsRouter } from './routers/stats'
import { importRouter } from './routers/import'
import { magazineRouter } from './routers/magazine'
import { telegramRouter } from './routers/telegram'

export const appRouter = router({
  competition: competitionRouter,
  submission: submissionRouter,
  source: sourceRouter,
  crawl: crawlRouter,
  ai: aiRouter,
  stats: statsRouter,
  import: importRouter,
  magazine: magazineRouter,
  telegram: telegramRouter,
})

export type AppRouter = typeof appRouter
