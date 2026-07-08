// Current logic K factors
const K_FACTORS_ROUND_ROBIN_FINALI = {
    roundRobin: 10,
    finals1st2ndWinner: 32,
    finals1st2ndLoser: 10,
    finals3rd4thWinner: 4,
    finals3rd4thLoser: 24,
};

const K_FACTORS_GIRONI_FASE_FINALE = {
    gironi: 16,
    semifinals: 20,
    finals1st2ndWinner: 32,
    finals1st2ndLoser: 12,
    finals3rd4thWinner: 8,
    finals3rd4thLoser: 24
};

function getKFactor(scenario, tType, phase, isWinner) {
    if (scenario === 'k16') return 16;
    if (scenario === 'k32') return 32;
    
    // Asymmetric
    if (tType === 'Round Robin + Finali') {
        if (phase === 'roundRobin') return 10;
        if (phase === 'finals1st2nd') return isWinner ? 32 : 10;
        if (phase === 'finals3rd4th') return isWinner ? 4 : 24;
    }
    if (tType === 'Gironi + Fase Finale') {
        if (phase === 'gironi') return 16;
        if (phase === 'semifinals') return 20;
        if (phase === 'finals1st2nd') return isWinner ? 32 : 12;
        if (phase === 'finals3rd4th') return isWinner ? 8 : 24;
    }
    if (tType === 'TorneOtto') {
        return 16;
    }
    return 16;
}

function calcPoints(eloA, eloB, scenario, tType, phase, aWins) {
    const expectedA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
    
    const kA = getKFactor(scenario, tType, phase, aWins);
    const scoreA = aWins ? 1 : 0;
    
    return kA * (scoreA - expectedA);
}

const scenarios = ['asymmetric', 'k16', 'k32'];

function simulateMatch(title, tType, phase, eloA, eloB) {
    console.log(`\n--- ${title} ---`);
    console.log(`Team A (ELO ${eloA}) vs Team B (ELO ${eloB})`);
    
    scenarios.forEach(scen => {
        const winA = calcPoints(eloA, eloB, scen, tType, phase, true);
        const loseA = calcPoints(eloA, eloB, scen, tType, phase, false);
        console.log(`Scenario ${scen.padEnd(10)} | Se A vince: ${winA > 0 ? '+' : ''}${winA.toFixed(1)} | Se A perde: ${loseA.toFixed(1)}`);
    });
}

// 1. ROUND ROBIN + FINALI
console.log("\n=== TORNEO: ROUND ROBIN + FINALI ===");
simulateMatch("Fase a Gironi (Scontri alla pari)", 'Round Robin + Finali', 'roundRobin', 1500, 1500);
simulateMatch("Finale 1°-2° Posto (Scontri alla pari)", 'Round Robin + Finali', 'finals1st2nd', 1500, 1500);
simulateMatch("Finale 3°-4° Posto (Scontri alla pari)", 'Round Robin + Finali', 'finals3rd4th', 1500, 1500);

// With unbalanced teams
simulateMatch("Finale 1°-2° Posto (A è molto più forte di B)", 'Round Robin + Finali', 'finals1st2nd', 1600, 1400);
simulateMatch("Finale 1°-2° Posto (A è molto più debole di B)", 'Round Robin + Finali', 'finals1st2nd', 1400, 1600);


// 2. GIRONI + FASE FINALE
console.log("\n=== TORNEO: GIRONI + FASE FINALE ===");
simulateMatch("Semifinale (Scontri alla pari)", 'Gironi + Fase Finale', 'semifinals', 1500, 1500);
simulateMatch("Finale 1°-2° Posto (Scontri alla pari)", 'Gironi + Fase Finale', 'finals1st2nd', 1500, 1500);


// 3. TORNEOTTO (Singolo girone continuo, K fisso a 16 attuale)
console.log("\n=== TORNEO: TORNEOTTO ===");
simulateMatch("Partita Qualsiasi (Scontri alla pari)", 'TorneOtto', 'roundRobin', 1500, 1500);
simulateMatch("Partita Qualsiasi (A molto forte, B debole)", 'TorneOtto', 'roundRobin', 1600, 1400);

