import fs from 'fs';

export function saveGameData(gameData) {
    fs.writeFileSync('game_data.json', JSON.stringify(gameData)); 
}

export function loadGameData() {
    try {
        const data = fs.readFileSync('game_data.json');
        return JSON.parse(data); 
    } catch (error) {
        return {}; 
    }
}