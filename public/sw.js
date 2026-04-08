const CACHE_NAME = 'literaturkompass-v3'
const STATIC_ASSETS = [
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

/**
 * Stale-while-revalidate: return cached response immediately,
 * fetch fresh version in the background and update cache.
 */
function staleWhileRevalidate(request) {
  return caches.open(CACHE_NAME).then((cache) =>
    cache.match(request).then((cached) => {
      const fetched = fetch(request)
        .then((response) => {
          if (response.ok) {
            cache.put(request, response.clone())
          }
          return response
        })
        .catch(() => cached) // offline fallback to cache

      return cached || fetched
    })
  )
}

/**
 * Network-first with timeout: try network, fall back to cache if slow/offline.
 */
function networkFirstWithTimeout(request, timeoutMs) {
  return new Promise((resolve) => {
    let resolved = false

    // Start network fetch
    const networkPromise = fetch(request).then((response) => {
      if (!resolved) {
        resolved = true
        // Cache successful responses
        if (response.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
        }
        resolve(response)
      }
      return response
    })

    // Timeout: serve from cache if network is slow
    setTimeout(() => {
      if (!resolved) {
        caches.match(request).then((cached) => {
          if (cached && !resolved) {
            resolved = true
            resolve(cached)
          }
        })
      }
    }, timeoutMs)

    // Network error: fall back to cache
    networkPromise.catch(() => {
      if (!resolved) {
        resolved = true
        caches.match(request).then((cached) => resolve(cached || new Response('Offline', { status: 503 })))
      }
    })
  })
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip non-GET requests
  if (event.request.method !== 'GET') return

  // API/tRPC: network-first with 3s timeout, fall back to cached response
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/trpc/')) {
    event.respondWith(networkFirstWithTimeout(event.request, 3000))
    return
  }

  // Page navigations: stale-while-revalidate — instant load from cache
  if (event.request.mode === 'navigate') {
    event.respondWith(staleWhileRevalidate(event.request))
    return
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  )
})
