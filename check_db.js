import { sql } from './server.js';
async function run() {
  const players = await sql`SELECT count(*) FROM players`;
  console.log("Total players:", players[0].count);
  process.exit(0);
}
run();
