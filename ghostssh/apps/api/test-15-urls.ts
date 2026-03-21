#!/usr/bin/env node
/**
 * 15-URL Jina AI Scraper Stress Test
 * Fires all 15 URLs through the /profile/scrape endpoint and reports pass/fail for each.
 */

const BASE_URL = 'http://localhost:8080';

const PROFILE_URLS = [
  // GitHub profiles
  'https://github.com/addyosmani',
  'https://github.com/sindresorhus',
  'https://github.com/tj',
  'https://github.com/gaearon',
  'https://github.com/kentcdodds',
  'https://github.com/nicolo-ribaudo',
  'https://github.com/mpj',
  'https://github.com/jaredpalmer',
  'https://github.com/sebmarkbage',
  // Personal/Portfolio Sites
  'https://kentcdodds.com/about',
  'https://addyosmani.com',
  'https://sindresorhus.com',
  // LinkedIn (Jina will attempt; may 403 gracefully)
  'https://www.linkedin.com/in/sindresorhus',
  'https://www.linkedin.com/in/kentcdodds',
  'https://www.linkedin.com/in/addy-osmani',
];

interface ScrapeResult {
  url: string;
  status: 'PASS' | 'FAIL';
  charCount?: number;
  error?: string;
  durationMs: number;
}

async function testUrl(url: string): Promise<ScrapeResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/profile/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: [url] }),
      signal: AbortSignal.timeout(60_000),
    });

    const data = await res.json();
    const durationMs = Date.now() - start;

    if (!res.ok || !data.text) {
      return { url, status: 'FAIL', error: data.error || data.message || 'No text returned', durationMs };
    }

    return { url, status: 'PASS', charCount: data.text.length, durationMs };
  } catch (err: any) {
    return { url, status: 'FAIL', error: err.message, durationMs: Date.now() - start };
  }
}

async function main() {
  console.log(`\n🚀 Starting 15-URL Jina Scraper Stress Test against ${BASE_URL}\n`);
  console.log('═'.repeat(80));

  const results = await Promise.all(PROFILE_URLS.map(testUrl));

  let passed = 0, failed = 0;

  results.forEach((r, i) => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    const label = r.status === 'PASS'
      ? `${(r.charCount! / 1000).toFixed(1)}KB extracted in ${r.durationMs}ms`
      : `ERROR: ${r.error}`;
    console.log(`${String(i+1).padStart(2)}. ${icon} ${r.url}`);
    console.log(`    └─ ${label}`);
    if (r.status === 'PASS') passed++; else failed++;
  });

  console.log('\n' + '═'.repeat(80));
  console.log(`\n📊 RESULTS: ${passed}/15 passed, ${failed}/15 failed`);
  if (failed === 0) {
    console.log('🎉 ALL 15 URLS SCRAPED SUCCESSFULLY!');
  } else {
    console.log(`⚠️  ${failed} URL(s) failed (some LinkedIn 403s are expected — Jina gracefully handles them)`);
  }
}

main().catch(console.error);
