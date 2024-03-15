export function swapPlayers(gameData) {
    const { currentPlayerId, challengerId, challengerName, opponentId, opponentName } = gameData; // Extract the values  
    console.log('trying to swap turns')
    if (currentPlayerId === challengerId) {
        console.log('swapping to opponent')
        gameData.currentPlayerId = opponentId;
        gameData.currentPlayerName = opponentName
    } else { // Implied - If currentPlayer !== challenger, then it must be the opponent
        console.log('swapping to challenger')
        gameData.currentPlayerId = challengerId;
        gameData.currentPlayerName = challengerName
    }
    return gameData;
}

/*
export async function combineImages(imagePath1, imagePath2, outputImagePath) {
    try {
        const [image1, image2] = await Promise.all([
            Jimp.read(imagePath1),
            Jimp.read(imagePath2)
        ]);

        // Place image2 on top of image1 (adjust coordinates as needed)
        image1.composite(image2, 0, 0);

        // Save the combined image
        await image1.writeAsync(outputImagePath); 

        console.log('Images combined successfully!');
    } catch (error) {
        console.error('Error combining images:', error);
    }
}*/
/*
// Example usage:
const heroes = [
    {
        name: "Kitsune",
        health: 100,
        damage: 20,
        metaTag: "Disruptor",
        abilityName: "Charm",
        energyCost: 4,
        activeEffects: [], // Start with an empty array
        isAlive: true
    },    {
        name: "Dwarf",
        health: 100,
        damage: 25,
        metaTag: "Momentum",
        abilityName: "Rage",
        energyCost: 3,
        activeEffects: [], // Start with an empty array
        isAlive: true
    },    {
        name: "Mighty Magus",
        health: 100,
        damage: 8,
        metaTag: "magus",
        abilityName: "Arcane Blast",
        energyCost: 3,
        activeEffects: [], // Start with an empty array
        isAlive: true
    },    {
        name: "Mighty Magus",
        health: 100,
        damage: 8,
        metaTag: "magus",
        abilityName: "Arcane Blast",
        energyCost: 3,
        activeEffects: [], // Start with an empty array
        isAlive: true
    },    {
        name: "Mighty Magus",
        health: 100,
        damage: 8,
        metaTag: "magus",
        abilityName: "Arcane Blast",
        energyCost: 3,
        activeEffects: [], // Start with an empty array
        isAlive: true
    },    {
        name: "Mighty Magus",
        health: 100,
        damage: 8,
        metaTag: "magus",
        abilityName: "Arcane Blast",
        energyCost: 3,
        activeEffects: [], // Start with an empty array
        isAlive: true
    },    {
        name: "Mighty Magus",
        health: 100,
        damage: 8,
        metaTag: "magus",
        abilityName: "Arcane Blast",
        energyCost: 3,
        activeEffects: [], // Start with an empty array
        isAlive: true
    },    {
        name: "Mighty Magus",
        health: 100,
        damage: 8,
        metaTag: "magus",
        abilityName: "Arcane Blast",
        energyCost: 3,
        activeEffects: [], // Start with an empty array
        isAlive: true
    },    {
        name: "Mighty Magus",
        health: 100,
        damage: 8,
        metaTag: "magus",
        abilityName: "Arcane Blast",
        energyCost: 3,
        activeEffects: [], // Start with an empty array
        isAlive: true
    },    {
        name: "Mighty Magus",
        health: 100,
        damage: 8,
        metaTag: "magus",
        abilityName: "Arcane Blast",
        energyCost: 3,
        activeEffects: [], // Start with an empty array
        isAlive: true
    },
    // Add more hero objects here...
];

function createHeroDataFile(heroes) {
    // Prepare the data structure
    const heroData = {
        heroes: heroes
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(heroData, null, 2);  // Indent for readability

    // Write the JSON to a file
    fs.writeFile('hero_data.json', jsonString, (err) => {
        if (err) {
            console.error('Error writing hero data:', err);
        } else {
            console.log('Hero data saved to hero_data.json');
        }
    });
}

*/