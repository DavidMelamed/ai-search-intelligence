import rateLimit from 'express-rate-limit';
import { cache } from '../config/redis';

// Create a custom store using Redis
const RedisStore = {
  async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    const multi = cache.getRedisClient().multi();
    const keyName = `rate_limit:${key}`;
    const ttl = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000;

    multi.incr(keyName);
    multi.expire(keyName, ttl);
    
    const results = await multi.exec();
    const totalHits = results?.[0]?.[1] as number || 1;
    
    return {
      totalHits,
      resetTime: new Date(Date.now() + ttl * 1000)
    };
  },

  async decrement(key: string): Promise<void> {
    await cache.getRedisClient().decr(`rate_limit:${key}`);
  },

  async resetKey(key: string): Promise<void> {
    await cache.del(`rate_limit:${key}`);
  }
};

// General rate limiter
export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  store: RedisStore as any
});

// Strict rate limiter for auth endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  store: RedisStore as any
});

// API rate limiter with higher limits for authenticated users
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    // Authenticated users get higher limits
    return req.headers.authorization ? 1000 : 100;
  },
  message: 'API rate limit exceeded.',
  standardHeaders: true,
  legacyHeaders: false,
  store: RedisStore as any
});