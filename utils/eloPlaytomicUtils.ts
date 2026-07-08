// utils/eloPlaytomicUtils.ts

export function eloToPlaytomic(elo: number): number {
    // Formula based on: 1200 = 2, 1500 = 3, 1800 = 4
    // Progression: 300 ELO = 1 Playtomic level
    const pt = (elo - 600) / 300;
    
    // Clamp between 0.0 and 7.0 for safety
    return Math.max(0.0, Math.min(7.0, Math.round(pt * 100) / 100));
}

export function playtomicToElo(pt: number): number {
    const clamped = Math.max(0.0, Math.min(7.0, pt));
    const elo = clamped * 300 + 600;
    return Math.round(elo);
}

export function playtomicLabel(pt: number): string {
    if (pt < 2) return 'Principiante';
    if (pt < 3) return 'Base';
    if (pt < 4) return 'Intermedio';
    if (pt < 5) return 'Avanzato';
    return 'Elite';
}
