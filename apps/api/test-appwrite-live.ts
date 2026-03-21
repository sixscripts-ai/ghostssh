import 'dotenv/config';
import { Client, Databases, ID } from 'node-appwrite';

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID || '';
const apiKey   = process.env.APPWRITE_API_KEY || '';
const DATABASE_ID = 'ghostssh';
const JOBS_COLLECTION_ID = 'jobs';

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const db = new Databases(client);

async function run() {
  console.log('\n🔐 Appwrite Config:');
  console.log(`  Endpoint:   ${endpoint}`);
  console.log(`  Project ID: ${projectId || '❌ MISSING'}`);
  console.log(`  API Key:    ${apiKey ? '✅ present (' + apiKey.slice(0,8) + '...)' : '❌ MISSING'}`);
  console.log('\n📦 Testing document write to collection "jobs"...');

  try {
    const doc = await db.createDocument(DATABASE_ID, JOBS_COLLECTION_ID, ID.unique(), {
      title: 'Appwrite Health Check Job',
      company: 'GhostSSH Test Suite',
      url: 'https://ghostssh.test/healthcheck',
      status: 'saved',
      matchScore: 99,
      location: 'Test::Remote',
      rationale: JSON.stringify({ text: 'Auto-generated health check document', missing: [], matching: ['TypeScript', 'Appwrite'] }),
    });
    console.log('\n✅ SUCCESS! Document written:');
    console.log(`  Doc ID:  ${doc.$id}`);
    console.log(`  Created: ${doc.$createdAt}`);
  } catch (err: any) {
    console.error('\n❌ Appwrite ERROR:', err.message);
    if (err.response) {
      console.error('  Response:', JSON.stringify(err.response, null, 2));
    }
    process.exit(1);
  }

  // Count total docs
  try {
    const list = await db.listDocuments(DATABASE_ID, JOBS_COLLECTION_ID);
    console.log(`\n📊 Total documents in "jobs" collection: ${list.total}`);
  } catch (e: any) {
    console.error('Could not list:', e.message);
  }
}

run();
