import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function run() {
    try {
        console.log("Finding tournament 'Six Flags'...");
        const tournaments = await sql`
            SELECT id, name, type, status, workspace_id
            FROM tournaments
            WHERE name ILIKE '%Six Flags%'
        `;
        
        console.log("Found:", JSON.stringify(tournaments, null, 2));

        if (tournaments.length === 0) {
            console.log("No tournament found matching 'Six Flags'");
            return;
        }

        const t = tournaments[0];
        console.log(`Attempting to delete tournament ID: ${t.id} ("${t.name}")...`);

        // Attempting to delete
        const result = await sql`
            DELETE FROM tournaments
            WHERE id = ${t.id}
        `;
        console.log("Delete result:", JSON.stringify(result, null, 2));
        console.log("Deleted successfully!");
    } catch (e) {
        console.error("Failed to delete:", e);
    }
}

run();
