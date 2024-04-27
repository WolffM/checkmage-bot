import fs from 'node:fs/promises';
let isSaving = false;
let currentSave = {};

export async function saveGameData(gameData, filename) {
    const jsonString = JSON.stringify(gameData);

    try {
        await fs.mkdir('genassets/savedgames', { recursive: true });

        const filePath = 'genassets/savedgames/' + filename;
        await fs.writeFile(filePath, jsonString);
    } catch (err) {
        console.error("Error saving game data:", err);
    }
}

export async function saveGameDataFields(filename, attributes) {
    if (isSaving) {
        console.log('CurrentSave:', currentSave)
        console.error('Save operation already in progress. Skipping.');
        console.log('Attributes:', attributes)
        return;
    }

    isSaving = true;
    currentSave = attributes

    try {
        const filePath = 'genassets/savedgames/' + filename;
        let existingData = {};

        try {
            const existingJson = await fs.readFile(filePath); 
            existingData = JSON.parse(existingJson);
        } catch (err) {
            // File might not exist yet
        }

        // Update multiple attributes
        for (const attributeName in attributes) {
            existingData[attributeName] = attributes[attributeName];
        }

        const jsonString = JSON.stringify(existingData);
        await fs.writeFile(filePath, jsonString); 
    } catch (err) {
        console.error("Error saving game data:", err);
    } finally {
        isSaving = false;
        currentSave = {}
    }
}

export async function loadGameData(type, filename) {
    try {
        const filePath = 'genassets/' + type + '/' + filename;
        const jsonString = await fs.readFile(filePath);
        const gameData = JSON.parse(jsonString);
        return gameData;
    } catch (err) {
        console.error("Error loading game data:", err);
        return null; // Or provide a default starting game state
    }
}