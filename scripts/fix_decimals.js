import fs from 'fs';
import path from 'path';

function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    for (const [search, replace] of replacements) {
        if (content.includes(search)) {
            content = content.replaceAll(search, replace);
            changed = true;
        }
    }
    if (changed) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    }
}

// 1. PlayersPage.tsx
replaceInFile('pages/PlayersPage.tsx', [
    ['player.currentElo.toFixed(0)', 'player.currentElo.toFixed(2)']
]);

// 2. RankingPage.tsx
replaceInFile('pages/RankingPage.tsx', [
    ['player.currentElo.toFixed(0)', 'player.currentElo.toFixed(2)']
]);

// 3. StatistichePage.tsx
replaceInFile('pages/StatistichePage.tsx', [
    ['diffElo = Math.abs(team1EloAvg - team2EloAvg).toFixed(0)', 'diffElo = Math.abs(team1EloAvg - team2EloAvg).toFixed(2)'],
    ['entry.eloTorneo.toFixed(0)', 'entry.eloTorneo.toFixed(2)'],
    ['entry.variazioneElo >= 0 ? \'+\' : \'\'}{entry.variazioneElo.toFixed(0)', 'entry.variazioneElo >= 0 ? \'+\' : \'\'}{entry.variazioneElo.toFixed(2)']
]);

// 4. DashboardPage.tsx
replaceInFile('pages/DashboardPage.tsx', [
    ['stats.avgElo.toFixed(0)', 'stats.avgElo.toFixed(2)'],
    ['p.currentElo.toFixed(0)', 'p.currentElo.toFixed(2)']
]);

// 5. PlayerProfileModal.tsx
replaceInFile('components/PlayerProfileModal.tsx', [
    ['player.currentElo.toFixed(0)', 'player.currentElo.toFixed(2)'],
    ['tickFormatter={(v) => String(Math.round(v))}', 'tickFormatter={(v) => Number(v).toFixed(2)}']
]);

// 6. TournamentFlow.tsx & BeatTheBoxFlow.tsx
replaceInFile('components/TournamentFlow.tsx', [
    ['avgElo.toFixed(0)', 'avgElo.toFixed(2)']
]);
replaceInFile('components/BeatTheBoxFlow.tsx', [
    ['player.currentElo.toFixed(0)', 'player.currentElo.toFixed(2)']
]);

// 7. RankingChart.tsx
replaceInFile('components/RankingChart.tsx', [
    ['tickFormatter={(tick) => String(Math.round(tick))}', 'tickFormatter={(tick) => Number(tick).toFixed(2)}']
]);

// 8. printService.ts
replaceInFile('services/printService.ts', [
    ['player.currentElo.toFixed(0)', 'player.currentElo.toFixed(2)'],
    ['entry.eloTorneo.toFixed(0)', 'entry.eloTorneo.toFixed(2)'],
    ['entry.variazioneElo.toFixed(0)', 'entry.variazioneElo.toFixed(2)'],
    ['p.currentElo.toFixed(0)', 'p.currentElo.toFixed(2)'],
    ['data.peakElo.toFixed(0)', 'data.peakElo.toFixed(2)'],
    ['>${Math.round(val)}<', '>${Number(val).toFixed(2)}<'],
    ['>${Math.round(last[pid])}', '>${Number(last[pid]).toFixed(2)}']
]);

console.log("All UI and PDF replacements completed.");
