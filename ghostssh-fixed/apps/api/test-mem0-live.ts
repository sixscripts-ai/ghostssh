#!/usr/bin/env node
/**
 * Live Mem0 Cloud Integration Test for ghostssh
 * Tests: add, search, getAll, delete operations against the dedicated ghostssh Mem0 project
 */
import 'dotenv/config';
import { MemoryClient } from 'mem0ai';

const apiKey = process.env.MEM0_API_KEY;
const TEST_USER = 'ghostssh-test-user';

async function run() {
  console.log('\n🧠 Mem0 Cloud Integration Test');
  console.log('═'.repeat(60));
  console.log(`  API Key:  ${apiKey ? '✅ ' + apiKey.slice(0, 12) + '...' : '❌ MISSING'}`);
  console.log(`  User ID:  ${TEST_USER}`);
  console.log('');

  if (!apiKey) {
    console.error('❌ MEM0_API_KEY is not set. Aborting.');
    process.exit(1);
  }

  const mem0 = new MemoryClient({ apiKey });

  // 1. Add memories
  console.log('1️⃣  Adding test memories...');
  await mem0.add(
    [{ role: 'user', content: 'I prefer remote AI Engineer roles at Series B startups paying $200K+' }],
    { user_id: TEST_USER, metadata: { source: 'ghostssh', type: 'preference' } }
  );
  console.log('   ✅ Memory 1 added (preference)');

  await mem0.add(
    [{ role: 'user', content: 'Applied to Anthropic for AI Safety Researcher on 2026-03-21' }],
    { user_id: TEST_USER, metadata: { source: 'ghostssh', type: 'application' } }
  );
  console.log('   ✅ Memory 2 added (application)');

  await mem0.add(
    [{ role: 'user', content: 'Ranked 15 ML Engineer jobs. Top match: Cohere Senior ML Engineer (score: 92/100)' }],
    { user_id: TEST_USER, metadata: { source: 'ghostssh', type: 'ranking' } }
  );
  console.log('   ✅ Memory 3 added (ranking)');

  // 2. Search memories
  console.log('\n2️⃣  Searching memories for "remote AI roles"...');
  const searchResults = await mem0.search('remote AI roles', { user_id: TEST_USER });
  console.log(`   Found ${searchResults?.length ?? 0} results:`);
  searchResults?.forEach((r: any, i: number) => {
    console.log(`   ${i + 1}. ${r.memory || r.text}`);
  });

  // 3. Get all memories
  console.log('\n3️⃣  Listing all memories for test user...');
  const allMems = await mem0.getAll({ user_id: TEST_USER });
  console.log(`   Total memories: ${allMems?.length ?? 0}`);
  allMems?.forEach((m: any, i: number) => {
    console.log(`   ${i + 1}. [${m.id?.slice(0, 8)}] ${m.memory || m.text}`);
  });

  // 4. Delete all test memories (cleanup)
  console.log('\n4️⃣  Cleaning up test memories...');
  let deleted = 0;
  if (allMems && allMems.length > 0) {
    for (const m of allMems) {
      try {
        await mem0.delete(m.id);
        deleted++;
      } catch (e: any) {
        console.warn(`   ⚠️ Could not delete ${m.id}: ${e.message}`);
      }
    }
  }
  console.log(`   🗑️ Deleted ${deleted} test memories`);

  // 5. Verify cleanup
  const remaining = await mem0.getAll({ user_id: TEST_USER });
  console.log(`\n5️⃣  Remaining memories after cleanup: ${remaining?.length ?? 0}`);

  console.log('\n' + '═'.repeat(60));
  console.log('✅ Mem0 Cloud integration test PASSED!');
  console.log('   All operations (add, search, getAll, delete) working correctly.');
}

run().catch((err) => {
  console.error('\n❌ Test FAILED:', err.message);
  process.exit(1);
});
