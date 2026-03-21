import 'dotenv/config';
import { MemoryClient } from 'mem0ai';

const apiKey = process.env.MEM0_API_KEY!;
const mem0 = new MemoryClient({ apiKey });
const USER = 'ghostssh-verify';

async function run() {
  console.log('💾 Adding memory...');
  await mem0.add(
    [{ role: 'user', content: 'User prefers remote AI Engineer roles in San Francisco Bay Area' }],
    { user_id: USER, metadata: { source: 'ghostssh', type: 'preference' } }
  );

  console.log('⏳ Waiting 6s for Mem0 indexing...');
  await new Promise(r => setTimeout(r, 6000));

  console.log('🔍 Searching...');
  const res = await mem0.search('remote AI jobs SF', { user_id: USER });
  console.log(`  Search results: ${res?.length ?? 0}`);
  res?.forEach((r: any, i: number) => console.log(`  ${i+1}. ${r.memory || r.text}`));

  console.log('📋 Listing all...');
  const all = await mem0.getAll({ user_id: USER });
  console.log(`  Total: ${all?.length ?? 0}`);
  all?.forEach((m: any, i: number) => console.log(`  ${i+1}. [${m.id?.slice(0,8)}] ${m.memory || m.text}`));

  // Cleanup
  for (const m of (all || [])) {
    try { await mem0.delete(m.id); } catch(e) {}
  }
  console.log('🗑️ Cleaned up.');
}

run().catch(console.error);
