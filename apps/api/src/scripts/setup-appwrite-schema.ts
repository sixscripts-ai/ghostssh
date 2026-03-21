import { Client, Databases, Permission, Role } from 'node-appwrite';
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

        console.log('Creating jobs collection...');
        try {
            await databases.getCollection('ghostssh', 'jobs');
            console.log('✅ Collection exists');
        } catch (e: any) {
            if (e.code === 404) {
                await databases.createCollection('ghostssh', 'jobs', 'Jobs');
                console.log('✅ Collection created');
            } else {
                throw e;
            }
        }

        console.log('Creating attributes...');
        const createAttr = async (fn: () => Promise<any>, name: string) => {
            try { 
                await fn(); 
                console.log(`✅ Attribute created: ${name}`);
            } catch(e: any) { 
                if (e.code === 409) {
                    console.log(`⏭️ Attribute already exists: ${name}`);
                } else {
                    console.error(`❌ Failed to create ${name}:`, e.message);
                }
            }
        };

        await createAttr(() => databases.createStringAttribute('ghostssh', 'jobs', 'title', 255, true), 'title');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'jobs', 'company', 255, true), 'company');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'jobs', 'url', 1000, true), 'url');
        // Status can be: saved, applied, interviewing, rejected
        await createAttr(() => databases.createStringAttribute('ghostssh', 'jobs', 'status', 50, false, 'saved'), 'status');
        await createAttr(() => databases.createIntegerAttribute('ghostssh', 'jobs', 'matchScore', false, 0, 100), 'matchScore');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'jobs', 'location', 255, false), 'location');
        await createAttr(() => databases.createStringAttribute('ghostssh', 'jobs', 'rationale', 5000, false), 'rationale');

        console.log('Updating collection permissions to public...');
        await databases.updateCollection('ghostssh', 'jobs', 'Jobs', [
            Permission.read(Role.any()), 
            Permission.write(Role.any()), 
            Permission.update(Role.any()), 
            Permission.delete(Role.any())
        ]);

        console.log('\n🎉 Setup complete!');
        console.log('Note: Appwrite attribute creation is asynchronous. It might take a minute before you can insert documents.');
    } catch (error) {
        console.error('\n❌ Error setting up Appwrite:', error);
    }
}

setup();
