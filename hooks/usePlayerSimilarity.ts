import { useState, useCallback } from 'react';

export interface SimilarityResult {
    player: {
        id: string;
        name: string;
        surname: string;
        currentElo: number;
    };
    surnameSimilarity: number;
    nameSimilarity: number;
}

export function usePlayerSimilarity(workspaceId: string | null) {
    const [isSearching, setIsSearching] = useState(false);

    const searchSimilarPlayer = useCallback(async (name: string, surname: string): Promise<SimilarityResult[]> => {
        if (!workspaceId || !name || !surname) return [];
        setIsSearching(true);
        try {
            const res = await fetch(`/api/players/search?workspaceId=${workspaceId}&name=${encodeURIComponent(name)}&surname=${encodeURIComponent(surname)}`);
            if (!res.ok) throw new Error('Search failed');
            const data: SimilarityResult[] = await res.json();
            return data;
        } catch (e) {
            console.error(e);
            return [];
        } finally {
            setIsSearching(false);
        }
    }, [workspaceId]);

    return { searchSimilarPlayer, isSearching };
}
