import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_QaHw1W3GbcON@ep-crimson-recipe-aglh7bqf-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require');

async function run() {
    try {
        const workspaces = await sql`SELECT id, name FROM workspaces`;
        console.log('Workspaces:', workspaces);

        for (const w of workspaces) {
            const tournaments = await sql`SELECT id, name, type FROM tournaments WHERE workspace_id = ${w.id}`;
            const players = await sql`SELECT count(*) as c FROM players WHERE workspace_id = ${w.id}`;
            console.log(`\nWorkspace: ${w.name} (${w.id}) - Players: ${players[0].c}`);
            if (tournaments.length > 0) {
                console.log('Tournaments:', tournaments.map(t => t.name).join(', '));
            } else {
                console.log('Tournaments: none');
            }
        }
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
