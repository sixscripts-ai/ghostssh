const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 18; // stay under 20/min limit
let timestamps: number[] = [];

export async function rateLimit(): Promise<void> {
  const now = Date.now();
  timestamps = timestamps.filter(t => now - t < WINDOW_MS);
  if (timestamps.length >= MAX_PER_WINDOW) {
    const oldest = timestamps[0] || now;
    const waitMs = WINDOW_MS - (now - oldest) + 500;
    console.log(`[RateLimit] Throttling ${waitMs}ms (${timestamps.length} calls in window)`);
    await new Promise(r => setTimeout(r, waitMs));
  }
  timestamps.push(Date.now());
}
