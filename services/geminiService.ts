import { GoogleGenAI } from '@google/genai';
import { Tournament, TournamentStandingEntry, Match } from '../types.ts';

export interface AiSummaryResponse {
    success: boolean;
    content: string;
}

export async function generateTournamentSummary(
    tournament: Tournament,
    standings: TournamentStandingEntry[],
    matches: Match[]
): Promise<AiSummaryResponse> {
    try {
        if (!process.env.API_KEY) {
            return { success: false, content: "AI Analysis Error: API key is not configured. Please set the API_KEY environment variable." };
        }
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const playerMap = new Map<string, string>();
        standings.forEach(entry => {
            entry.team.forEach(player => {
                if (!playerMap.has(player.id)) {
                    playerMap.set(player.id, `${player.name} ${player.surname}`);
                }
            });
        });

        const getPlayerFullName = (id: string) => playerMap.get(id) ?? `Unknown Player`;

        const formattedStandings = standings.map((s, index) => {
            const teamNames = `${getPlayerFullName(s.team[0].id)} & ${getPlayerFullName(s.team[1].id)}`;
            return `${index + 1}. Team: ${teamNames} - Points: ${s.points}, Game Difference: ${s.gameDifference}`;
        }).join('\n');

        const formattedMatches = matches.map(m => {
            const team1Players = `${getPlayerFullName(m.team1[0])} & ${getPlayerFullName(m.team1[1])}`;
            const team2Players = `${getPlayerFullName(m.team2[0])} & ${getPlayerFullName(m.team2[1])}`;
            const score = m.sets.map(s => `${s.team1}-${s.team2}`).join(', ');
            return `- ${team1Players} vs ${team2Players}: ${score}`;
        }).join('\n');

        const prompt = `
            You are a charismatic and slightly dramatic sports commentator specializing in Padel tennis.
            Analyze the results of the "${tournament.type}" tournament held on ${new Date(tournament.date).toLocaleDateString()} at ${tournament.club}.
            
            Write a fun, narrative summary of the tournament. 
            - Start with a catchy headline.
            - Describe the overall atmosphere and key moments.
            - Highlight the winning team and their performance.
            - Mention any surprising results or standout players.
            - Conclude with a memorable sign-off.
            
            Keep the tone engaging and journalistic. Use markdown for formatting (e.g., bold for headlines).

            Here is the tournament data:

            **Final Standings:**
            ${formattedStandings}

            **Match Results:**
            ${formattedMatches}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const text = response.text;
        
        if (text && typeof text === 'string') {
            return { success: true, content: text };
        }

        console.error("Unexpected response format from Gemini API:", response);
        return { success: false, content: "AI Analysis Error: The AI response was not in the expected text format." };
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        let errorMessage = "An unknown error occurred while generating the summary.";
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (error && typeof error === 'object' && 'message' in error) {
            errorMessage = String((error as { message: unknown }).message);
        } else {
            errorMessage = String(error);
        }
        return { success: false, content: `AI Analysis Error: ${errorMessage}` };
    }
}
