import { Client, Databases } from 'node-appwrite';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://sfo.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID || '';
const apiKey = process.env.APPWRITE_API_KEY || '';

if (!projectId) {
  console.warn('[Appwrite] APPWRITE_PROJECT_ID not set — database writes will fail.');
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

export const databases = new Databases(client);
export const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'ghostssh';
export const JOBS_COLLECTION_ID = process.env.APPWRITE_JOBS_COLLECTION_ID || 'jobs';
export const PROFILES_COLLECTION_ID = process.env.APPWRITE_PROFILES_COLLECTION_ID || 'profiles';
export const APPLICATIONS_COLLECTION_ID = process.env.APPWRITE_APPLICATIONS_COLLECTION_ID || 'applications';
