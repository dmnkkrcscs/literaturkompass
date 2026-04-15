export async function register() {
  // Crawling is handled by the dedicated worker container (Dockerfile.worker)
  // via BullMQ. Running crawls here starves the web server's event loop,
  // causing 504 timeouts on static assets and page requests.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  console.log('[App] Next.js server registered (crawling delegated to worker)')
}
