import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const adminToken = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '1h' });

const API_URL = 'http://localhost:3002'; // assuming we start the server on 3002

async function api(path, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${API_URL}${path}`, options);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function run() {
  console.log('Testing ELO calculation and tournament creation...');
  
  // Create workspace
  const wsRes = await api('/api/admin/workspaces', 'POST', { name: 'Esitiamo 2026', ownerName: 'Test' });
  const wsId = wsRes.workspace.id;
  
  const token = jwt.sign({ admin: true, sub: wsId }, JWT_SECRET, { expiresIn: '1h' });
  
  async function wsApi(path, method = 'GET', body = null) {
    const options = {
      method,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(`${API_URL}${path}`, options);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  // Add players
  const playerNames = ['Goku', 'Vegeta', 'Gohan', 'Piccolo', 'Trunks', 'Goten', 'Krillin', 'Yamcha'];
  for (const name of playerNames) {
    await wsApi('/api/players', 'POST', { name, surname: 'Z', position: 'Left' });
  }
  const dataRes = await wsApi('/api/data');
  const players = dataRes.players.filter(p => playerNames.includes(p.name));
  console.log('Created players.');

  const types = ['torneotto', 'americano', 'beat_the_box', 'round_robin', 'gironi', 'torneo_libero', 'torneo_squadre'];
  for (const type of types) {
    console.log(`Creating tournament: ${type}`);
    await wsApi('/api/tournaments/bulk-matches', 'POST', {
      tournament: { name: `Test ${type}`, type, date: new Date().toISOString(), club: 'Test Club', status: 'completed' },
      matches: [
        {
          date: new Date().toISOString(),
          team1: [players[0].id, players[1].id],
          team2: [players[2].id, players[3].id],
          sets: [{ team1: 6, team2: 4 }],
          winner: 'team1',
          phase: 'girone',
          is_custom_match: false
        }
      ]
    });
  }
  
  console.log('Testing recalculate endpoint...');
  const recRes = await api('/api/admin/recalculate-elos', 'POST', { workspaceId: wsId });
  console.log('Recalculate result:', recRes);

  console.log('SUCCESS!');
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
