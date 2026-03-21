import { Client, Databases } from 'node-appwrite';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Warning: Do not export `client` if it exposes the API key to untrusted domains
// But since this is a backend service, it's fine.
const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

export const databases = new Databases(client);
export const DATABASE_ID = 'ghostssh';
export const JOBS_COLLECTION_ID = 'jobs';
