import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function run() {
    try {
        console.log("Starting DB Cleanup and Migration...");

        // 1. Delete orphaned child tournaments
        console.log("1. Deleting orphaned child tournaments...");
        const deletedChildTournaments = await sql`
            DELETE FROM tournaments
            WHERE team_tournament_root_id IS NOT NULL
              AND team_tournament_root_id NOT IN (SELECT id FROM tournaments)
        `;
        console.log(`Deleted ${deletedChildTournaments.length} orphaned child tournaments.`);

        // 2. Delete orphaned configs
        console.log("2. Deleting orphaned team tournament configs...");
        const deletedConfigs = await sql`
            DELETE FROM team_tournament_configs
            WHERE tournament_id NOT IN (SELECT id FROM tournaments)
        `;
        console.log(`Deleted ${deletedConfigs.length} orphaned configs.`);

        // 3. Delete orphaned teams
        console.log("3. Deleting orphaned team tournament teams...");
        const deletedTeams = await sql`
            DELETE FROM team_tournament_teams
            WHERE tournament_id NOT IN (SELECT id FROM tournaments)
        `;
        console.log(`Deleted ${deletedTeams.length} orphaned teams.`);

        // 4. Delete orphaned matchdays
        console.log("4. Deleting orphaned team tournament matchdays...");
        const deletedMatchdays = await sql`
            DELETE FROM team_tournament_matchdays
            WHERE root_tournament_id NOT IN (SELECT id FROM tournaments)
        `;
        console.log(`Deleted ${deletedMatchdays.length} orphaned matchdays.`);

        // 5. Delete orphaned fixtures
        console.log("5. Deleting orphaned team tournament fixtures...");
        const deletedFixtures = await sql`
            DELETE FROM team_tournament_fixtures
            WHERE root_tournament_id NOT IN (SELECT id FROM tournaments)
        `;
        console.log(`Deleted ${deletedFixtures.length} orphaned fixtures.`);

        // 6. Alter tournaments table to add foreign key constraint with ON DELETE CASCADE
        console.log("6. Altering tournaments table to add foreign key constraint...");
        try {
            // Drop constraint if it already exists (to avoid duplicate constraint errors)
            await sql`
                ALTER TABLE tournaments 
                DROP CONSTRAINT IF EXISTS fk_tournaments_team_tournament_root
            `;
            
            // Add constraint
            await sql`
                ALTER TABLE tournaments
                ADD CONSTRAINT fk_tournaments_team_tournament_root
                FOREIGN KEY (team_tournament_root_id)
                REFERENCES tournaments(id)
                ON DELETE CASCADE
            `;
            console.log("Successfully added fk_tournaments_team_tournament_root foreign key constraint with ON DELETE CASCADE!");
        } catch (alterError) {
            console.error("Failed to add foreign key constraint:", alterError.message);
        }

        console.log("Migration and cleanup finished successfully!");
    } catch (e) {
        console.error("Migration failed:", e);
    }
}

run();
