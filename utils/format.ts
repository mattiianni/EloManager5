export interface PlayerNameInput {
    name: string;
    surname: string;
}

export const formatPlayerName = (player?: PlayerNameInput | null): string => {
    if (!player) return '?';
    const name = (player.name || '').trim();
    const surname = (player.surname || '').trim();
    if (!surname) return name;
    return `${name} ${surname}`;
};
