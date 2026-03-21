import { databases, DATABASE_ID, JOBS_COLLECTION_ID } from './src/lib/appwrite.js';
import { ID } from 'node-appwrite';

async function testConnection() {
  console.log(`Pinging Appwrite Database (${DATABASE_ID}) Collection (${JOBS_COLLECTION_ID})...`);
  try {
    const doc = await databases.createDocument(DATABASE_ID, JOBS_COLLECTION_ID, ID.unique(), {
      title: 'Diagnostic Test Connection',
      company: 'Appwrite Diagnostic',
      url: 'https://test-connection.com',
      status: 'saved',
      matchScore: 100,
      location: 'Remote',
      rationale: '{"test":"true"}'
    });
    console.log('✅ SUCCESS: Appwrite Connection and Write Permissions Verified!');
    console.log('Document ID:', doc.$id);
  } catch (err: any) {
    console.error('❌ ERROR: Appwrite Connection Failed!');
    console.error(err.message || err);
  }
}

testConnection();
