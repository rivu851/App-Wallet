import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import "dotenv/config"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "60 s"), // 100 requests per 60 seconds
})

export default ratelimit
