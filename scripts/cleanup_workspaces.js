import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config();

async function run() {
  const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL);
  
  // Find workspaces named 'Esitiamo 2026'
  const workspaces = await sql`SELECT id FROM workspaces WHERE name = 'Esitiamo 2026'`;
  console.log(`Found ${workspaces.length} workspaces to delete.`);
  
  for (const ws of workspaces) {
    const wsId = ws.id;
    console.log(`Deleting workspace ${wsId}...`);
    // Delete related data first
    await sql`DELETE FROM matches WHERE workspace_id = ${wsId}`;
    await sql`DELETE FROM elo_history WHERE workspace_id = ${wsId}`;
    await sql`DELETE FROM players WHERE workspace_id = ${wsId}`;
    await sql`DELETE FROM tournaments WHERE workspace_id = ${wsId}`;
    await sql`DELETE FROM workspaces WHERE id = ${wsId}`;
  }
  
  console.log('Cleanup complete!');
}

run().catch(console.error);
