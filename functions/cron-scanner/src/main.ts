import { Client, Databases, Query } from 'node-appwrite';

/**
 * Appwrite Function: Job Scanner Cron
 * Runs every 6 hours.
 * Reads opted-in users from Appwrite, calls POST /jobs/search on the ghostssh API.
 */
export default async ({ req, res, log, error }: any) => {
  log('Starting Job Scanner Cron...');

  const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
  const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
  const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
  const API_URL = process.env.API_URL || 'http://host.docker.internal:8080';

  if (!APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
    error('Missing Appwrite environment variables.');
    return res.json({ success: false, error: 'Missing environment variables' }, 500);
  }

  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  const databases = new Databases(client);
  const DATABASE_ID = 'ghostssh';

  try {
    // 1. Fetch opted-in users
    log('Fetching active users...');
    let usersResponse;
    try {
      usersResponse = await databases.listDocuments(DATABASE_ID, 'users', [
        Query.equal('cronEnabled', true)
      ]);
    } catch (dbErr: any) {
      // If collection doesn't exist yet, just fail gracefully
      if (dbErr.code === 404) {
         log('Users collection not found. Make sure to create it.');
         return res.json({ success: true, count: 0, message: 'Collection not found' });
      }
      throw dbErr;
    }

    const activeUsers = usersResponse.documents;
    log(`Found ${activeUsers.length} users enabled for cron.`);

    // 2. Call the API for each user
    let successCount = 0;
    
    for (const user of activeUsers) {
      try {
        log(`Processing user: ${user.githubUsername}...`);
        
        const payload = {
          githubUsername: user.githubUsername,
          manualTargetTitles: user.targetTitles ? JSON.parse(user.targetTitles) : [],
          manualLocations: user.targetLocations ? JSON.parse(user.targetLocations) : ['Remote'],
          provider: user.provider || 'minimax',
          topK: 10
        };

        const response = await fetch(`${API_URL}/jobs/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const text = await response.text();
          error(`API call failed for ${user.githubUsername} [${response.status}]: ${text}`);
          continue;
        }

        log(`API call successful for ${user.githubUsername}.`);
        successCount++;

        // 3. Update last scan timestamp
        await databases.updateDocument(DATABASE_ID, 'users', user.$id, {
          lastScanAt: new Date().toISOString()
        });

      } catch (userErr: any) {
        error(`Failed processing user ${user.githubUsername}: ${userErr.message}`);
      }
    }

    log(`Cron finished. Scanned ${successCount} out of ${activeUsers.length} users.`);
    return res.json({ success: true, count: successCount });

  } catch (err: any) {
    error(`Cron failed: ${err.message}`);
    return res.json({ success: false, error: err.message }, 500);
  }
};
