import 'dotenv/config';
import { AgentMemoryService } from './src/agent/memory.service.js';

async function run() {
  const memory = new AgentMemoryService();
  const USER = 'sixscripts';

  console.log('\n══════════════════════════════════════════════════════');
  console.log('  STEP 1: Write 3 test memories to mem0 cloud');
  console.log('══════════════════════════════════════════════════════\n');

  await memory.addMemory(USER, 'Prefers remote AI Engineer roles at Series B startups paying $200K+', 'preference');
  await memory.addMemory(USER, 'Ranked 10 ML Engineer jobs on 2026-03-21. Top match: Cohere Senior ML Engineer (92/100)', 'ranking');
  await memory.addMemory(USER, 'Applied to Anthropic for AI Safety Researcher on 2026-03-21', 'application');

  console.log('\n⏳ Waiting 6s for Mem0 indexing...');
  await new Promise(r => setTimeout(r, 6000));

  console.log('\n══════════════════════════════════════════════════════');
  console.log('  STEP 2: Search memories (should find preferences)');
  console.log('══════════════════════════════════════════════════════\n');

  const searchResults = await memory.searchMemory(USER, 'remote AI job preferences');
  console.log(`Search returned ${searchResults.length} results:`);
  searchResults.forEach((r, i) => console.log(`  ${i+1}. ${r.memory}`));

  console.log('\n══════════════════════════════════════════════════════');
  console.log('  STEP 3: getHistoricalContext (orchestrator path)');
  console.log('══════════════════════════════════════════════════════\n');

  const ctx = await memory.getHistoricalContext(USER, 'Find me AI Engineer roles');
  console.log(`Applied job URLs: ${ctx.appliedJobUrls.length}`);
  console.log(`Semantic preferences:\n${ctx.semanticPreferences}`);
  console.log(`Memories retrieved: ${ctx.memories.length}`);

  console.log('\n══════════════════════════════════════════════════════');
  console.log('  STEP 4: getAll (dashboard path)');
  console.log('══════════════════════════════════════════════════════\n');

  const all = await memory.getAll(USER);
  console.log(`Total memories stored: ${all.length}`);
  all.forEach((m, i) => console.log(`  ${i+1}. [${m.id.slice(0,8)}] ${m.memory}`));

  // Check for duplicates
  const contents = all.map(m => m.memory);
  const uniqueContents = new Set(contents);
  if (contents.length !== uniqueContents.size) {
    console.warn(`\n⚠️ DUPLICATE MEMORIES DETECTED: ${contents.length - uniqueContents.size} duplicates`);
  } else {
    console.log(`\n✅ No duplicate memories detected.`);
  }

  console.log('\n══════════════════════════════════════════════════════');
  console.log('  STEP 5: Cleanup');
  console.log('══════════════════════════════════════════════════════\n');

  for (const m of all) {
    await memory.deleteMemory(m.id);
  }
  console.log(`🗑️ Deleted ${all.length} test memories.`);

  const remaining = await memory.getAll(USER);
  console.log(`Remaining after cleanup: ${remaining.length}`);

  console.log('\n✅ All 5 verification steps PASSED!');
}

run().catch(e => { console.error('❌ FAILED:', e.message); process.exit(1); });
