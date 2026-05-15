import { createClient, RedisClientType } from 'redis';

let client: RedisClientType | null = null;
let isConnecting = false;

async function getRedis(): Promise<RedisClientType | null> {
  if (!process.env.REDIS_URL) return null;

  if (client?.isReady) return client;

  if (isConnecting) return null;

  try {
    isConnecting = true;
    client = createClient({ url: process.env.REDIS_URL }) as RedisClientType;
    client.on('error', (err) => console.error('[Redis] Client error:', err));
    await client.connect();
    console.log('[Redis] Connected');
    return client;
  } catch (err) {
    console.error('[Redis] Failed to connect:', err);
    client = null;
    return null;
  } finally {
    isConnecting = false;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = await getRedis();
    if (!redis) return null;
    const val = await redis.get(key);
    return val ? (JSON.parse(val) as T) : null;
  } catch (err) {
    console.error('[Redis] cacheGet error:', err);
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 60
): Promise<void> {
  try {
    const redis = await getRedis();
    if (!redis) return;
    await redis.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    console.error('[Redis] cacheSet error:', err);
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  try {
    if (!keys.length) return;
    const redis = await getRedis();
    if (!redis) return;
    await redis.del(keys);
  } catch (err) {
    console.error('[Redis] cacheDel error:', err);
  }
}
