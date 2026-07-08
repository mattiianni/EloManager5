import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const API_URL = 'http://localhost:3002';
const WS_ID = 'a2664ea3-42bf-447e-b76a-3987380900e2';

const token = jwt.sign({ admin: true, sub: WS_ID }, JWT_SECRET, { expiresIn: '1h' });

async function wsApi(path, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${API_URL}${path}`, options);
  if (!res.ok) {
    console.error(await res.text());
    throw new Error('API Request Failed');
  }
  return res.json();
}

async function run() {
  const players = [
    '0846eef2-84a6-4056-bca6-0900ff6a7ac3', // Alessio
    '6652fc74-0499-4d57-9dd1-5c869044dc2c', // Riccardo B
    'ba4fa281-6e7c-43ea-996d-9f815c6ff243', // Francesco
    'b4612865-cbac-40d6-aed5-45c8d4ea3fef'  // Riccardo R
  ];

  const types = ['torneotto', 'americano', 'beat_the_box', 'Round Robin + Finali'];
  let giornataIndex = 1;

  for (const type of types) {
    console.log(`Creating test giornata ${giornataIndex} (${type})...`);
    
    const date = new Date();
    date.setDate(date.getDate() - (10 - giornataIndex)); // Past days

    await wsApi('/api/tournaments/bulk-matches', 'POST', {
      tournament: { 
        name: `Giornata ${giornataIndex} (${type})`, 
        type: type, 
        date: date.toISOString(), 
        club: 'Test Club', 
        status: 'completed',
        giornataName: 'Esitiamo 2026 TEST'
      },
      matches: [
        {
          date: date.toISOString(),
          team1: [players[0], players[1]],
          team2: [players[2], players[3]],
          sets: [{ team1: 6, team2: 4 }],
          winner: 'team1',
          phase: 'girone',
          is_custom_match: false
        }
      ]
    });
    giornataIndex++;
  }
  
  console.log('Successfully created test giornate in main workspace!');
}

run().catch(console.error);
