import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/elomanager' });

async function run() {
    const { rows } = await pool.query(`
        SELECT * FROM tournaments WHERE name ILIKE '%Padel Academy%' OR club ILIKE '%Padel Academy%' LIMIT 5;
    `);
    console.log("Tournaments found:", rows.map(r => ({id: r.id, name: r.name, rootId: r.team_tournament_root_id})));
    
    if (rows.length > 0) {
        const rootId = rows[0].team_tournament_root_id || rows[0].id;
        const { rows: matchdays } = await pool.query(`
            SELECT * FROM team_tournament_matchdays WHERE tournament_root_id = $1
        `, [rootId]);
        console.log(`Found ${matchdays.length} matchdays for root ${rootId}`);
        for (const md of matchdays) {
            console.log(`Matchday ${md.id} Date: ${md.date}`);
            console.log(JSON.stringify(md.sub_matches, null, 2).slice(0, 500));
        }
    }
    process.exit(0);
}
run();
