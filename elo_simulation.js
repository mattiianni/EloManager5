import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

// Current logic K factors
const K_FACTORS_ROUND_ROBIN_FINALI = {
    roundRobin: 10,
    finals1st2ndWinner: 32,
    finals1st2ndLoser: 10,
    finals3rd4thWinner: 4,
    finals3rd4thLoser: 24,
    finals5th6thWinner: 4,
    finals5th6thLoser: 24,
    finals7th8thWinner: 4,
    finals7th8thLoser: 24
};

const K_FACTORS_GIRONI_FASE_FINALE = {
    gironi: 16,
    semifinals: 20,
    finals1st2ndWinner: 32,
    finals1st2ndLoser: 12,
    finals3rd4thWinner: 8,
    finals3rd4thLoser: 24
};

function calculateEloDelta(elo1, elo2, score1, scenario, phase, tType) {
    const expectedScore1 = 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
    const expectedScore2 = 1 - expectedScore1;
    const score2 = 1 - score1;
    
    let kFactor1, kFactor2;

    if (scenario === 'asymmetric') {
        if (tType === 'Round Robin + Finali' && phase) {
            if (phase === 'roundRobin') {
                kFactor1 = 10; kFactor2 = 10;
            } else if (phase === 'finals1st2nd') {
                kFactor1 = score1 === 1 ? 32 : 10;
                kFactor2 = score2 === 1 ? 32 : 10;
            } else if (phase === 'finals3rd4th') {
                kFactor1 = score1 === 1 ? 4 : 24;
                kFactor2 = score2 === 1 ? 4 : 24;
            } else {
                kFactor1 = 28; kFactor2 = 28;
            }
        } else if (tType === 'Gironi + Fase Finale' && phase) {
            if (phase === 'gironi') {
                kFactor1 = 16; kFactor2 = 16;
            } else if (phase === 'semifinals') {
                kFactor1 = 20; kFactor2 = 20;
            } else if (phase === 'finals1st2nd') {
                kFactor1 = score1 === 1 ? 32 : 12;
                kFactor2 = score2 === 1 ? 32 : 12;
            } else {
                kFactor1 = 20; kFactor2 = 20;
            }
        } else {
            // Default depending on type
            let baseK = 16;
            if (tType === 'Americano') baseK = 24;
            else if (tType === 'Friendly Match') baseK = 20;
            else if (tType === 'Torneo Libero') baseK = 24;
            kFactor1 = baseK; kFactor2 = baseK;
        }
    } else if (scenario === 'k16') {
        kFactor1 = 16;
        kFactor2 = 16;
    } else if (scenario === 'k32') {
        kFactor1 = 32;
        kFactor2 = 32;
    }

    const delta1 = kFactor1 * (score1 - expectedScore1);
    const delta2 = kFactor2 * (score2 - expectedScore2);
    
    return { delta1, delta2 };
}

async function runSimulation() {
    try {
        console.log("Fetching all matches across the entire app...");
        
        // Fetch ALL matches, ordered strictly chronologically
        const matches = await sql`
            SELECT m.*, t.type as tournament_type
            FROM matches m
            JOIN tournaments t ON m.tournament_id = t.id
            ORDER BY t.date ASC, m.created_at ASC
        `;
        
        console.log(`Found ${matches.length} total matches in the database.`);

        // Initialize all players at 1500
        const playersState = {};
        const players = await sql`SELECT id, name, surname FROM players`;
        for (const p of players) {
            playersState[p.id] = {
                name: `${p.name} ${p.surname}`,
                eloAsym: 1500,
                eloK16: 1500,
                eloK32: 1500,
                matchesPlayed: 0
            };
        }

        // Run simulation
        for (const m of matches) {
            if (!m.winner) continue; // Skip incomplete
            
            let phase = m.phase || 'roundRobin';

            const p1 = playersState[m.team1_p1_id];
            const p2 = playersState[m.team1_p2_id];
            const p3 = playersState[m.team2_p1_id];
            const p4 = playersState[m.team2_p2_id];

            if (!p1 || !p2 || !p3 || !p4) continue;

            p1.matchesPlayed++; p2.matchesPlayed++; p3.matchesPlayed++; p4.matchesPlayed++;

            const tType = m.tournament_type || 'TorneOtto 30\'';
            
            // Asymmetric
            const t1EloAsym = (p1.eloAsym + p2.eloAsym) / 2;
            const t2EloAsym = (p3.eloAsym + p4.eloAsym) / 2;
            const score1 = m.winner === 'team1' ? 1 : (m.winner === 'team2' ? 0 : 0.5);
            
            const { delta1: d1Asym, delta2: d2Asym } = calculateEloDelta(t1EloAsym, t2EloAsym, score1, 'asymmetric', phase, tType);
            p1.eloAsym += d1Asym; p2.eloAsym += d1Asym;
            p3.eloAsym += d2Asym; p4.eloAsym += d2Asym;

            // K16
            const t1EloK16 = (p1.eloK16 + p2.eloK16) / 2;
            const t2EloK16 = (p3.eloK16 + p4.eloK16) / 2;
            const { delta1: d1K16, delta2: d2K16 } = calculateEloDelta(t1EloK16, t2EloK16, score1, 'k16', phase, tType);
            p1.eloK16 += d1K16; p2.eloK16 += d1K16;
            p3.eloK16 += d2K16; p4.eloK16 += d2K16;

            // K32
            const t1EloK32 = (p1.eloK32 + p2.eloK32) / 2;
            const t2EloK32 = (p3.eloK32 + p4.eloK32) / 2;
            const { delta1: d1K32, delta2: d2K32 } = calculateEloDelta(t1EloK32, t2EloK32, score1, 'k32', phase, tType);
            p1.eloK32 += d1K32; p2.eloK32 += d1K32;
            p3.eloK32 += d2K32; p4.eloK32 += d2K32;
        }

        // Get 10 random players who have played at least 5 matches
        const activePlayers = Object.values(playersState).filter(p => p.matchesPlayed >= 5);
        
        // Shuffle and pick 10
        const shuffled = activePlayers.sort(() => 0.5 - Math.random());
        const random10 = shuffled.slice(0, 10);
        
        console.log("\n=== 10 GIOCATORI A CASO (Tutte le partite giocate nel DB) ===");
        random10.forEach(p => {
            console.log(`- ${p.name} (${p.matchesPlayed} partite)`);
            console.log(`  Asimmetrico (Attuale) : ${p.eloAsym.toFixed(1)}`);
            console.log(`  Standard K=16         : ${p.eloK16.toFixed(1)}`);
            console.log(`  Standard K=32         : ${p.eloK32.toFixed(1)}`);
            const diff16 = p.eloK16 - p.eloAsym;
            const diff32 = p.eloK32 - p.eloAsym;
            console.log(`  Diff: K16 = ${diff16 > 0 ? '+'+diff16.toFixed(1) : diff16.toFixed(1)} | K32 = ${diff32 > 0 ? '+'+diff32.toFixed(1) : diff32.toFixed(1)}`);
            console.log('');
        });

    } catch (e) {
        console.error(e);
    }
}

runSimulation();
