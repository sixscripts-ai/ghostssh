import { Client, Databases, Permission, Role, IndexType, OrderBy } from 'node-appwrite';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

if (!process.env.APPWRITE_PROJECT_ID || !process.env.APPWRITE_API_KEY) {
  console.error('ERROR: Missing APPWRITE_PROJECT_ID or APPWRITE_API_KEY in .env');
  console.error('Please create a project in Appwrite, generate an API key, and add them to apps/api/.env');
  process.exit(1);
}

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function setup() {
    try {
        console.log('Creating database (ghostssh)...');
        let db;
        try {
            db = await databases.get('ghostssh');
            console.log('✅ Database exists');
        } catch (e: any) {
            if (e.code === 404) {
                db = await databases.create('ghostssh', 'GhostSSH DB');
                console.log('✅ Database created');
            } else {
                throw e;
            }
        }

        const createColl = async (id: string, name: string) => {
            console.log(`Creating ${name} collection...`);
            try {
                await databases.getCollection('ghostssh', id);
                console.log(`✅ Collection exists: ${id}`);
            } catch (e: any) {
                if (e.code === 404) {
                    await databases.createCollection('ghostssh', id, name);
                    console.log(`✅ Collection created: ${id}`);
                    
                    // Setup permissions for new collections too
                    await databases.updateCollection('ghostssh', id, name, [
                        Permission.read(Role.any()), 
                        Permission.write(Role.any()), 
                        Permission.update(Role.any()), 
                        Permission.delete(Role.any())
                    ]);
                } else {
                    throw e;
                }
            }
        };

        await createColl('jobs', 'Jobs');
        await createColl('agent_events', 'Agent Events');
        await createColl('usage', 'Usage');
        await createColl('outreach_drafts', 'Outreach Drafts');

        console.log('Creating attributes...');
        const createAttr = async (fn: () => Promise<any>, name: string) => {
            try { 
                await fn(); 
                console.log(`✅ ${name}`);
            } catch(e: any) { 
                if (e.code === 409) {
                    // exists
                } else {
                    console.error(`❌ Failed to create ${name}:`, e.message);
                }
            }
        };

        const createIdx = async (fn: () => Promise<any>, name: string) => {
            try { 
                await fn(); 
                console.log(`✅ Index ${name}`);
            } catch(e: any) { 
                if (e.code === 409) {
                    // exists
                } else {
                    console.error(`❌ Failed to create index ${name}:`, e.message);
                }
            }
        };

        // Jobs
        await createAttr(() => databases.createStringAttribute('ghostssh', 'jobs', 'title', 255, true), 'title');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'jobs', 'company', 255, true), 'company');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'jobs', 'url', 1000, true), 'url');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'jobs', 'status', 50, false, 'saved'), 'status');
        await createAttr(() => databases.createIntegerAttribute('ghostssh', 'jobs', 'matchScore', false, 0, 100), 'matchScore');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'jobs', 'location', 255, false), 'location');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'jobs', 'rationale', 5000, false), 'rationale');

        // Agent Events
        await createAttr(() => databases.createStringAttribute('ghostssh', 'agent_events', 'userId', 64, true), 'agent_events.userId');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'agent_events', 'agent', 32, true), 'agent_events.agent');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'agent_events', 'action', 128, true), 'agent_events.action');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'agent_events', 'status', 32, true), 'agent_events.status');
        await createAttr(() => databases.createIntegerAttribute('ghostssh', 'agent_events', 'duration_ms', true), 'agent_events.duration_ms');
        await createAttr(() => databases.createIntegerAttribute('ghostssh', 'agent_events', 'result_count', false), 'agent_events.result_count');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'agent_events', 'error_message', 512, false), 'agent_events.error_message');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'agent_events', 'metadata', 2000, false), 'agent_events.metadata');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'agent_events', 'timestamp', 32, true), 'agent_events.timestamp');
        await createIdx(() => databases.createIndex('ghostssh', 'agent_events', 'byUser', IndexType.Key, ['userId'], [OrderBy.Asc]), 'agent_events.byUser');
        await createIdx(() => databases.createIndex('ghostssh', 'agent_events', 'byAgent', IndexType.Key, ['agent'], [OrderBy.Asc]), 'agent_events.byAgent');

        // Usage
        await createAttr(() => databases.createStringAttribute('ghostssh', 'usage', 'userId', 64, true), 'usage.userId');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'usage', 'date', 10, true), 'usage.date');
        await createAttr(() => databases.createIntegerAttribute('ghostssh', 'usage', 'run_count', true), 'usage.run_count');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'usage', 'tier', 16, true), 'usage.tier');
        // date uniquely? The plan says "Index: byUserDate on [userId, date] — unique"
        await createIdx(() => databases.createIndex('ghostssh', 'usage', 'byUserDate', IndexType.Unique, ['userId', 'date'], [OrderBy.Asc, OrderBy.Asc]), 'usage.byUserDate');

        // Outreach drafts
        await createAttr(() => databases.createStringAttribute('ghostssh', 'outreach_drafts', 'userId', 64, true), 'outreach_drafts.userId');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'outreach_drafts', 'company', 128, true), 'outreach_drafts.company');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'outreach_drafts', 'contactName', 128, true), 'outreach_drafts.contactName');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'outreach_drafts', 'contactRole', 128, true), 'outreach_drafts.contactRole');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'outreach_drafts', 'contactEmail', 256, false), 'outreach_drafts.contactEmail');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'outreach_drafts', 'contactLinkedin', 512, false), 'outreach_drafts.contactLinkedin');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'outreach_drafts', 'subject1', 256, true), 'outreach_drafts.subject1');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'outreach_drafts', 'subject2', 256, true), 'outreach_drafts.subject2');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'outreach_drafts', 'subject3', 256, true), 'outreach_drafts.subject3');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'outreach_drafts', 'body', 3000, true), 'outreach_drafts.body');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'outreach_drafts', 'status', 32, true), 'outreach_drafts.status');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'outreach_drafts', 'followUpDate', 32, true), 'outreach_drafts.followUpDate');
        await createIdx(() => databases.createIndex('ghostssh', 'outreach_drafts', 'byUser', IndexType.Key, ['userId'], [OrderBy.Asc]), 'outreach_drafts.byUser');
        await createIdx(() => databases.createIndex('ghostssh', 'outreach_drafts', 'byStatus', IndexType.Key, ['status'], [OrderBy.Asc]), 'outreach_drafts.byStatus');

        console.log('\n🎉 Setup complete!');
        console.log('Note: Appwrite attribute creation is asynchronous. It might take a minute before you can insert documents.');
    } catch (error) {
        console.error('\n❌ Error setting up Appwrite:', error);
    }
}

setup();
