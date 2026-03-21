import { Client, Databases } from 'appwrite';

const client = new Client();

// Fallback to empty string to prevent build crashes, but it will fail at runtime if missing
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '';

client
    .setEndpoint(endpoint)
    .setProject(projectId);

export const databases = new Databases(client);
export const DATABASE_ID = 'ghostssh';
export const JOBS_COLLECTION_ID = 'jobs';
