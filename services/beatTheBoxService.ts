import { Player, Match, TournamentStandingEntry, SetScore } from '../types.ts';

/**
 * BEAT THE BOX SERVICE
 * 
 * Gestisce la logica di creazione e gestione del torneo "Beat the Box":
 * - Distribuzione giocatori nei box (zigzag ELO)
 * - Creazione partite round robin per box
 * - Calcolo qualificati
 * - Creazione semifinali/finali
 */

// Interfaccia per i dati di un box
export interface BoxData {
    boxNumber: number;
    players: Player[]; // 4 giocatori
    matches: Omit<Match, 'id' | 'tournamentId'>[]; // 3 partite
}

// Interfaccia per la classifica di un box
export interface BoxStanding {
    boxNumber: number;
    standings: {
        player: Player;
        points: number;
        gamesWon: number;
        gamesLost: number;
        gameDifference: number;
        rank: number; // 1-4 dentro il box
    }[];
}

/**
 * Distribuisce le coppie nei box con distribuzione zigzag basata su ELO
 * 
 * @param pairs - Array di coppie [Player, Player] ordinate per ELO decrescente
 * @returns Array di box, ognuno con 4 giocatori (2 coppie)
 */
export function distributePlayersIntoBoxes(pairs: [Player, Player][]): Player[][] {
    const numBoxes = pairs.length / 2;
    const boxes: Player[][] = Array(numBoxes).fill(null).map(() => []);
    
    // Distribuzione zigzag delle teste di serie
    // Esempio 6 coppie: Box1=[1°,6°], Box2=[2°,5°], Box3=[3°,4°]
    for (let i = 0; i < numBoxes; i++) {
        const firstSeedPair = pairs[i]; // 1°, 2°, 3°...
        const lastSeedPair = pairs[pairs.length - 1 - i]; // Ultimo, penultimo...
        
        // Aggiungi i 4 giocatori al box
        boxes[i] = [...firstSeedPair, ...lastSeedPair];
    }
    
    return boxes;
}

/**
 * Crea le 3 partite round robin per un box di 4 giocatori
 * 
 * @param boxPlayers - Array di 4 giocatori del box
 * @param date - Data del torneo
 * @returns Array di 3 match
 */
export function createBoxMatches(
    boxPlayers: Player[], 
    date: string
): Omit<Match, 'id' | 'tournamentId'>[] {
    if (boxPlayers.length !== 4) {
        throw new Error('Un box deve avere esattamente 4 giocatori');
    }
    
    const [p1, p2, p3, p4] = boxPlayers;
    
    // Round Robin: ogni giocatore gioca con ognuno degli altri (alternando i partner)
    const matches: Omit<Match, 'id' | 'tournamentId'>[] = [
        // Partita 1: G1+G2 vs G3+G4
        {
            date,
            team1: [p1.id, p2.id],
            team2: [p3.id, p4.id],
            sets: [],
            winner: null,
        },
        // Partita 2: G1+G3 vs G2+G4
        {
            date,
            team1: [p1.id, p3.id],
            team2: [p2.id, p4.id],
            sets: [],
            winner: null,
        },
        // Partita 3: G1+G4 vs G2+G3
        {
            date,
            team1: [p1.id, p4.id],
            team2: [p2.id, p3.id],
            sets: [],
            winner: null,
        },
    ];
    
    return matches;
}

/**
 * Crea tutte le partite per tutti i box
 * 
 * @param boxes - Array di box (ognuno con 4 giocatori)
 * @param date - Data del torneo
 * @returns Array di BoxData con partite per ogni box
 */
export function createAllBoxMatches(
    boxes: Player[][], 
    date: string
): BoxData[] {
    return boxes.map((boxPlayers, index) => ({
        boxNumber: index + 1,
        players: boxPlayers,
        matches: createBoxMatches(boxPlayers, date),
    }));
}

/**
 * Calcola la classifica di un singolo box basandosi sui risultati
 * 
 * @param boxMatches - Partite del box (con risultati)
 * @param boxPlayers - Giocatori del box
 * @returns Classifica ordinata del box
 */
export function calculateBoxStandings(
    boxMatches: Match[],
    boxPlayers: Player[]
): BoxStanding['standings'] {
    // Mappa per tracciare le statistiche di ogni giocatore
    const playerStats = new Map<string, {
        player: Player;
        points: number;
        gamesWon: number;
        gamesLost: number;
    }>();
    
    // Inizializza tutti i giocatori
    boxPlayers.forEach(player => {
        playerStats.set(player.id, {
            player,
            points: 0,
            gamesWon: 0,
            gamesLost: 0,
        });
    });
    
    // Processa ogni partita
    boxMatches.forEach((match, idx) => {
        console.log(`🎾 Match ${idx + 1}:`, {
            winner: match.winner,
            sets: match.sets,
            team1: match.team1,
            team2: match.team2
        });
        
        if (!match.winner || match.winner === 'draw') {
            console.log(`⚠️ Match ${idx + 1} skipped: winner=${match.winner}`);
            return;
        }
        
        const team1Games = match.sets.reduce((sum, set) => sum + set.team1, 0);
        const team2Games = match.sets.reduce((sum, set) => sum + set.team2, 0);
        
        console.log(`✅ Match ${idx + 1} processed: Team1=${team1Games} games, Team2=${team2Games} games, Winner=${match.winner}`);
        
        // Assegna punti e games ai giocatori
        match.team1.forEach(playerId => {
            const stats = playerStats.get(playerId);
            if (stats) {
                if (match.winner === 'team1') stats.points += 3;
                else if (match.winner === 'draw') stats.points += 1;
                stats.gamesWon += team1Games;
                stats.gamesLost += team2Games;
            }
        });
        
        match.team2.forEach(playerId => {
            const stats = playerStats.get(playerId);
            if (stats) {
                if (match.winner === 'team2') stats.points += 3;
                else if (match.winner === 'draw') stats.points += 1;
                stats.gamesWon += team2Games;
                stats.gamesLost += team1Games;
            }
        });
    });
    
    // Converti in array e ordina
    const standings = Array.from(playerStats.values())
        .map(stats => ({
            player: stats.player,
            points: stats.points,
            gamesWon: stats.gamesWon,
            gamesLost: stats.gamesLost,
            gameDifference: stats.gamesWon - stats.gamesLost,
            rank: 0, // Verrà assegnato dopo l'ordinamento
        }))
        .sort((a, b) => {
            // Ordina per punti, poi per differenza games
            if (b.points !== a.points) return b.points - a.points;
            return b.gameDifference - a.gameDifference;
        });
    
    // Assegna i rank
    standings.forEach((standing, index) => {
        standing.rank = index + 1;
    });
    
    return standings;
}

/**
 * Raggruppa i match per box analizzando i giocatori coinvolti.
 * NON dipende dall'ordine dei match — funziona anche se i match sono mescolati.
 * Un match appartiene a un box se TUTTI i suoi giocatori sono già nel set del box.
 * Match con giocatori da box diversi (finali/semifinali) finiscono in gruppi separati.
 */
export function groupMatchesByPlayerSets(matches: Match[]): { boxes: Map<number, Match[]>, phaseMatches: Match[] } {
    const groups = new Map<number, Match[]>();

    matches.forEach(match => {
        const matchPlayerIds = [...match.team1, ...match.team2];

        // Cerca un gruppo esistente che contiene TUTTI i giocatori di questo match
        for (const [groupNum, groupMatches] of groups.entries()) {
            const groupPlayerIds = new Set(
                groupMatches.flatMap(m => [...m.team1, ...m.team2])
            );
            if (matchPlayerIds.every(id => groupPlayerIds.has(id))) {
                groupMatches.push(match);
                return;
            }
        }

        // Nessun gruppo trovato — crea nuovo gruppo
        groups.set(groups.size + 1, [match]);
    });

    // Separa box reali (3 match con 4 giocatori unici) da match di fase (finali/semifinali)
    const boxes = new Map<number, Match[]>();
    const phaseMatches: Match[] = [];
    let boxNum = 1;

    groups.forEach(groupMatches => {
        const uniquePlayers = new Set(groupMatches.flatMap(m => [...m.team1, ...m.team2]));
        if (groupMatches.length >= 3 && uniquePlayers.size === 4) {
            boxes.set(boxNum++, groupMatches);
        } else {
            phaseMatches.push(...groupMatches);
        }
    });

    return { boxes, phaseMatches };
}

/**
 * Calcola le classifiche di tutti i box.
 * Usa i match già raggruppati per box in boxesData (NON più slice per indice).
 */
export function calculateAllBoxStandings(
    allMatches: Match[],
    boxesData: BoxData[]
): BoxStanding[] {
    console.log(`📦 calculateAllBoxStandings chiamato con ${allMatches.length} match totali e ${boxesData.length} box`);

    return boxesData.map((boxData, boxIdx) => {
        // Trova i match per questo box basandosi sui giocatori del box
        const boxPlayerIds = new Set(boxData.players.map(p => p.id));
        const boxMatches = allMatches.filter(m => {
            const matchPlayerIds = [...m.team1, ...m.team2];
            return matchPlayerIds.every(id => boxPlayerIds.has(id));
        });

        console.log(`📦 Box ${boxData.boxNumber}: found ${boxMatches.length} matches for ${boxData.players.length} players`);

        const standings = calculateBoxStandings(boxMatches, boxData.players);
        console.log(`📦 Box ${boxData.boxNumber} standings:`, standings.map(s => ({ name: s.player.name, points: s.points, diff: s.gameDifference })));

        return {
            boxNumber: boxData.boxNumber,
            standings,
        };
    });
}

/**
 * Crea le finali per il caso 4 COPPIE (2 BOX)
 * 
 * Finale 1°-2°: 1° Box1 + 2° Box2 vs 1° Box2 + 2° Box1
 * Finalina 3°-4°: 3° Box1 + 4° Box2 vs 3° Box2 + 4° Box1
 */
export function createFinalsFor4Pairs(
    boxStandings: BoxStanding[],
    date: string
): Omit<Match, 'id' | 'tournamentId'>[] {
    if (boxStandings.length !== 2) {
        throw new Error('createFinalsFor4Pairs richiede esattamente 2 box');
    }
    
    const box1 = boxStandings[0].standings;
    const box2 = boxStandings[1].standings;
    
    // Finale 1°-2°
    const finale1_2: Omit<Match, 'id' | 'tournamentId'> = {
        date,
        team1: [box1[0].player.id, box2[1].player.id], // 1° Box1 + 2° Box2
        team2: [box2[0].player.id, box1[1].player.id], // 1° Box2 + 2° Box1
        sets: [],
        winner: null,
    };
    
    // Finalina 3°-4°
    const finalina3_4: Omit<Match, 'id' | 'tournamentId'> = {
        date,
        team1: [box1[2].player.id, box2[3].player.id], // 3° Box1 + 4° Box2
        team2: [box2[2].player.id, box1[3].player.id], // 3° Box2 + 4° Box1
        sets: [],
        winner: null,
    };
    
    return [finale1_2, finalina3_4];
}

/**
 * Crea le finali per il caso 6 COPPIE (3 BOX)
 * 
 * Qualificati: 3 primi + miglior secondo
 * Finale 1°-2°: 1° casuale + miglior 2° vs altri 2 primi
 * Finalina 3°-4°: Miglior 2° + Peggior 3° vs Peggior 2° + Miglior 3°
 * Consolazione: Ultimi 2 rimasti
 */
export function createFinalsFor6Pairs(
    boxStandings: BoxStanding[],
    date: string
): Omit<Match, 'id' | 'tournamentId'>[] {
    if (boxStandings.length !== 3) {
        throw new Error('createFinalsFor6Pairs richiede esattamente 3 box');
    }
    
    // Estrai i primi classificati di ogni box
    const firsts = boxStandings.map(box => box.standings[0]);
    
    // Trova i secondi classificati e ordina per punti/differenza
    const seconds = boxStandings.map(box => box.standings[1])
        .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return b.gameDifference - a.gameDifference;
        });
    const bestSecond = seconds[0];
    const worstSecond = seconds[2];
    
    // Trova i terzi classificati e ordina
    const thirds = boxStandings.map(box => box.standings[2])
        .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return b.gameDifference - a.gameDifference;
        });
    const bestThird = thirds[0];
    const worstThird = thirds[2];
    
    // Sorteggio casuale per la finale: quale primo va con il miglior secondo?
    const shuffledFirsts = [...firsts].sort(() => Math.random() - 0.5);
    const firstWithBestSecond = shuffledFirsts[0];
    const otherFirsts = shuffledFirsts.slice(1);
    
    // Finale 1°-2°
    const finale1_2: Omit<Match, 'id' | 'tournamentId'> = {
        date,
        team1: [firstWithBestSecond.player.id, bestSecond.player.id],
        team2: [otherFirsts[0].player.id, otherFirsts[1].player.id],
        sets: [],
        winner: null,
    };
    
    // Finalina 3°-4°: Miglior 2° + Peggior 3° vs Peggior 2° + Miglior 3°
    const finalina3_4: Omit<Match, 'id' | 'tournamentId'> = {
        date,
        team1: [seconds[1].player.id, worstThird.player.id], // Medio 2° + Peggior 3°
        team2: [worstSecond.player.id, bestThird.player.id], // Peggior 2° + Miglior 3°
        sets: [],
        winner: null,
    };
    
    // Consolazione: ultimi rimasti (4° di ogni box - 3 giocatori, ne prendiamo 2 a caso)
    const fourths = boxStandings.map(box => box.standings[3]);
    const consolationPlayers = fourths.slice(0, 2); // Prendiamo i primi 2
    
    const consolazione: Omit<Match, 'id' | 'tournamentId'> = {
        date,
        team1: [consolationPlayers[0].player.id, thirds[1].player.id], // 4° + Medio 3°
        team2: [consolationPlayers[1].player.id, consolationPlayers[2]?.player.id || fourths[2].player.id],
        sets: [],
        winner: null,
    };
    
    return [finale1_2, finalina3_4, consolazione];
}

/**
 * Crea semifinali e finali per il caso 8+ COPPIE (4+ BOX)
 * 
 * Semifinale 1: 1° Box1 + 2° Box1 vs 1° Box2 + 2° Box2
 * Semifinale 2: 1° Box3 + 2° Box3 vs 1° Box4 + 2° Box4
 * Finale 1°-2°: Vincitore SF1 vs Vincitore SF2
 * Finalina 3°-4°: Perdente SF1 vs Perdente SF2
 */
export function createSemifinalsAndFinalsFor8Plus(
    boxStandings: BoxStanding[],
    date: string,
    semifinalResults?: { sf1Winner: 'team1' | 'team2', sf2Winner: 'team1' | 'team2' }
): {
    semifinals: Omit<Match, 'id' | 'tournamentId'>[];
    finals: Omit<Match, 'id' | 'tournamentId'>[];
} {
    if (boxStandings.length < 4) {
        throw new Error('Servono almeno 4 box per semifinali');
    }
    
    // Semifinali: accoppia i box a coppie
    const semifinals: Omit<Match, 'id' | 'tournamentId'>[] = [];
    
    for (let i = 0; i < boxStandings.length; i += 2) {
        if (i + 1 >= boxStandings.length) break;
        
        const box1 = boxStandings[i].standings;
        const box2 = boxStandings[i + 1].standings;
        
        semifinals.push({
            date,
            team1: [box1[0].player.id, box1[1].player.id], // 1° + 2° BoxN
            team2: [box2[0].player.id, box2[1].player.id], // 1° + 2° BoxN+1
            sets: [],
            winner: null,
        });
    }
    
    // Finali: create solo se abbiamo i risultati delle semifinali
    const finals: Omit<Match, 'id' | 'tournamentId'>[] = [];
    
    if (semifinalResults && semifinals.length >= 2) {
        const sf1 = semifinals[0];
        const sf2 = semifinals[1];
        
        // Determina vincitori e perdenti delle semifinali
        const sf1WinnerTeam = semifinalResults.sf1Winner === 'team1' ? sf1.team1 : sf1.team2;
        const sf1LoserTeam = semifinalResults.sf1Winner === 'team1' ? sf1.team2 : sf1.team1;
        const sf2WinnerTeam = semifinalResults.sf2Winner === 'team1' ? sf2.team1 : sf2.team2;
        const sf2LoserTeam = semifinalResults.sf2Winner === 'team1' ? sf2.team2 : sf2.team1;
        
        // Finale 1°-2°
        finals.push({
            date,
            team1: sf1WinnerTeam,
            team2: sf2WinnerTeam,
            sets: [],
            winner: null,
        });
        
        // Finalina 3°-4°
        finals.push({
            date,
            team1: sf1LoserTeam,
            team2: sf2LoserTeam,
            sets: [],
            winner: null,
        });
    }
    
    return { semifinals, finals };
}

/**
 * Determina quale tipo di finale creare in base al numero di box
 */
export function createFinalsMatches(
    numBoxes: number,
    boxStandings: BoxStanding[],
    date: string,
    semifinalResults?: { sf1Winner: 'team1' | 'team2', sf2Winner: 'team1' | 'team2' }
): {
    semifinals?: Omit<Match, 'id' | 'tournamentId'>[];
    finals: Omit<Match, 'id' | 'tournamentId'>[];
} {
    if (numBoxes === 2) {
        // 4 coppie: solo finali
        return {
            finals: createFinalsFor4Pairs(boxStandings, date),
        };
    } else if (numBoxes === 3) {
        // 6 coppie: 3 finali (1°-2°, 3°-4°, consolazione)
        return {
            finals: createFinalsFor6Pairs(boxStandings, date),
        };
    } else {
        // 8+ coppie: semifinali + finali
        const { semifinals, finals } = createSemifinalsAndFinalsFor8Plus(
            boxStandings, 
            date, 
            semifinalResults
        );
        return { semifinals, finals };
    }
}

/**
 * Verifica se il numero di coppie è valido per Beat the Box
 */
export function isValidPairsCount(pairsCount: number): boolean {
    return pairsCount >= 4 && pairsCount % 2 === 0;
}

/**
 * Calcola il numero di box in base al numero di coppie
 */
export function calculateNumBoxes(pairsCount: number): number {
    return pairsCount / 2;
}

/**
 * Ordina le coppie per ELO medio decrescente
 */
export function sortPairsByElo(pairs: [Player, Player][]): [Player, Player][] {
    return [...pairs].sort((a, b) => {
        const eloA = (a[0].currentElo + a[1].currentElo) / 2;
        const eloB = (b[0].currentElo + b[1].currentElo) / 2;
        return eloB - eloA; // Decrescente
    });
}

/**
 * Crea la classifica finale individuale basata su variazione ELO
 */
export function createIndividualStandings(
    allPlayers: Player[],
    eloChanges: Map<string, number>
): Array<{ player: Player; eloChange: number; rank: number }> {
    return allPlayers
        .map(player => ({
            player,
            eloChange: eloChanges.get(player.id) || 0,
            rank: 0,
        }))
        .sort((a, b) => b.eloChange - a.eloChange)
        .map((entry, index) => ({
            ...entry,
            rank: index + 1,
        }));
}

/**
 * Ottiene tutti i giocatori da un array di box
 */
export function getAllPlayersFromBoxes(boxes: Player[][]): Player[] {
    return boxes.flat();
}
