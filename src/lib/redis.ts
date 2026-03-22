import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as { redis: Redis }

function createRedisClient(): Redis {
  const redisUrl = process.env.REDIS_URL

  if (!redisUrl) {
    throw new Error(
      'REDIS_URL environment variable is not set. Please configure Redis connection.'
    )
  }

  return new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  })
}

export const redis =
  globalForRedis.redis ||
  (() => {
    try {
      return createRedisClient()
    } catch (error) {
      console.error('Failed to create Redis client:', error)
      throw error
    }
  })()

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis
}

// Optional: Add connection event handlers
redis.on('connect', () => {
  console.log('Redis connected')
})

redis.on('error', (err) => {
  console.error('Redis error:', err)
})
