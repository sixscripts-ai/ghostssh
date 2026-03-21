import { Client, Databases } from 'appwrite';

const client = new Client();

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://sfo.cloud.appwrite.io/v1';
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '';

if (!projectId && typeof window !== 'undefined') {
  console.warn('[Appwrite] NEXT_PUBLIC_APPWRITE_PROJECT_ID is not set — database queries will fail.');
}

client
  .setEndpoint(endpoint)
  .setProject(projectId);

export const databases = new Databases(client);
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'ghostssh';
export const JOBS_COLLECTION_ID = 'jobs';
export const PROFILES_COLLECTION_ID = 'profiles';
export const APPLICATIONS_COLLECTION_ID = 'applications';
