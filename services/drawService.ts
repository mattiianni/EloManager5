import { Player } from '../types.ts';

export type DrawMode = 'Normal' | 'Balanced' | 'Seeded' | 'Manual';

// Utility function to shuffle an array
const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

export function generatePairs(
    participants: Player[],
    mode: DrawMode,
    numPairs: number,
    seedIds: string[] = []
): [Player, Player][] {
    
    const maxPossiblePairs = Math.floor(participants.length / 2);
    if (numPairs > maxPossiblePairs) {
        throw new Error("Cannot generate more pairs than half the number of participants.");
    }

    let pairs: [Player, Player][] = [];
    let playersToPair = [...participants];

    switch (mode) {
        case 'Normal': {
            const shuffledPlayers = shuffleArray(playersToPair);
            for (let i = 0; i < numPairs * 2; i += 2) {
                pairs.push([shuffledPlayers[i], shuffledPlayers[i + 1]]);
            }
            break;
        }

        case 'Balanced': {
            const sortedPlayers = [...playersToPair].sort((a, b) => b.currentElo - a.currentElo);
            const selectedPlayers = sortedPlayers.slice(0, numPairs * 2);
            let left = 0;
            let right = selectedPlayers.length - 1;
            while (left < right) {
                pairs.push([selectedPlayers[left], selectedPlayers[right]]);
                left++;
                right--;
            }
            break;
        }

        case 'Seeded': {
            const seeds = playersToPair.filter(p => seedIds.includes(p.id));
            let nonSeeds = playersToPair.filter(p => !seedIds.includes(p.id));
            
            if (seeds.length > numPairs) {
                throw new Error("More seeds selected than pairs to be generated.");
            }
            if (nonSeeds.length < seeds.length){
                 throw new Error("Not enough non-seed players to pair with seeds.");
            }

            nonSeeds = shuffleArray(nonSeeds);
            
            for (let i = 0; i < seeds.length; i++) {
                pairs.push([seeds[i], nonSeeds.pop()!]);
            }

            // Fill remaining pairs if needed
            while (pairs.length < numPairs && nonSeeds.length >= 2) {
                pairs.push([nonSeeds.pop()!, nonSeeds.pop()!]);
            }
            break;
        }
    }

    return pairs;
}
