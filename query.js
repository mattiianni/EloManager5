import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function run() {
    // find tournament
    const t = await sql`SELECT * FROM tournaments WHERE name ILIKE '%pippo pera%'`;
    console.log("Tournaments:", t);
    
    if (t.length > 0) {
        // find matchdays
        const m = await sql`SELECT * FROM team_tournament_matchdays WHERE tournament_day_id = ${t[0].id} OR tournament_day_id IN (SELECT id FROM tournaments WHERE team_tournament_root_id = ${t[0].id})`;
        console.log("Matchdays:", m.length);
        
        if (m.length > 0) {
            const matches = await sql`SELECT * FROM team_tournament_matchday_matches WHERE matchday_id IN (${m.map(x => x.id).join(',')})`;
            console.log("Matches:", matches.length);
            console.log("Sample match:", matches[0]);
        }
        
        // check elo history
        const h = await sql`SELECT * FROM elo_history WHERE source_label ILIKE '%pippo pera%'`;
        console.log("Elo History records:", h.length);
    }
}
run().catch(console.error);
