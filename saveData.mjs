import fs from 'node:fs/promises';

export async function saveGameData(gameData, filename) {
    const jsonString = JSON.stringify(gameData);

    try {
        await fs.mkdir('savedgames', { recursive: true });

        const filePath = 'savedgames/' + filename;
        await fs.writeFile(filePath, jsonString);
    } catch (err) {
        console.error("Error saving game data:", err);
    }
}

export async function loadGameData(filename) {
    try {
        const filePath = 'savedgames/' + filename;
        const jsonString = await fs.readFile(filePath);
        const gameData = JSON.parse(jsonString);
        return gameData;
    } catch (err) {
        console.error("Error loading game data:", err);
        return null; // Or provide a default starting game state
    }
}