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