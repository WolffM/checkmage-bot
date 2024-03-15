import { saveGameData, loadGameData } from './saveData.mjs';
import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import { swapPlayers } from './helper.mjs';

dotenv.config();
const TOKEN = process.env.DISCORD_TOKEN;
let gameInProgress = false;

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => { // Updated event name
    if (message.author.bot) return;

    if (gameInProgress) {
        if (message.content.startsWith('!resign') || message.content.startsWith('!ff')) {
            await handleResignation(message);
        }
        else {
            await message.author.reply({ content: 'A game is inprogress!', ephemeral: true });
        }
        return;
    } else if (message.content.startsWith('!thursday')) {
        await createWeeklyCalendarMessage(message.channel, 4);
        await message.delete();
    } else if (message.content.startsWith('!friday')) {
        await createWeeklyCalendarMessage(message.channel, 5);
        await message.delete();
    } else if (message.content.startsWith('!triviastats')) {
        await calculateTriviaStats(message.channel);
        await message.delete();
    } else if (message.content.startsWith('!herodraft3')) {
        await startHerodraft(message, 3);
    } else if (message.content.startsWith('!herodraft5')) {
        await startHerodraft(message, 5);
    } else if (message.content.startsWith('!herodraft0')) {
        await startHerodraft(message, 0);
    } else if (message.content.startsWith('!roll')) {
        await calculateRollResult(message.content.slice(5), message); // slice to remove '!roll'
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    else if (interaction.customId === 'herodraft_accept') {
        const opponent = interaction.user;
        const channel = interaction.channel
        let challenger = null;

        // Fetch recent messages to find the challenge
        const messages = await interaction.channel.messages.fetch({ limit: 10 }); // Adjust limit if needed
        const challengeMessage = messages.find(msg => msg.content.startsWith('!herodraft'));

        if (challengeMessage) {
            challenger = challengeMessage.author;
        } else {
            // Handle case where no challenge message is found 
            await interaction.reply({ content: 'Could not find the original challenge message.', ephemeral: true });
            return;
        }

        if (challenger.id === opponent.id) { // Check if IDs match 
            await interaction.reply({ content: 'You cannot battle yourself!', ephemeral: true });
            return;
        }

        // Create and send the game start embed
        const embed = new EmbedBuilder()
            .setTitle('Game Starting!')
            .setDescription(`${challenger.username} vs ${opponent.username}`);

        // Modify response to remove button and send embed
        await interaction.update({ embed: embed, components: [] });

        let gameCounter = 1;
        let gameFilename = '';
        const now = new Date();
        const dateString = now.toISOString().substring(0, 10); // YYYY-MM-DD format
        do {
            gameFilename = `${dateString}-${gameCounter}-${challenger.username}-vs-${opponent.username}.json`;
            if (fs.existsSync(`savedgames/${gameFilename}`)) {
                gameCounter++;
            } else {
                break; // Found a unique filename
            }
        } while (true);

        console.log('gameFilename', gameFilename)

        let currentPlayerId = challenger.id;
        let currentPlayerName = challenger.username

        if (Math.random() < 0.5) {
            currentPlayerId = challenger.id;
            currentPlayerName = challenger.username
            await channel.send(`${challenger.username.toString()} won the coin toss and goes first!`);
        } else {
            currentPlayerId = opponent.id;
            currentPlayerName = opponent.username
            await channel.send(`${opponent.username.toString()} won the coin toss and goes first!`);
        }

        // Initialize game data
        const gameData = {
            activeChallengerHero: 'Kitsune',
            activeOpponentHero: 'Dwarf',
            challengerId: challenger.id,
            challengerName: challenger.username,
            challengerEnergy: 3,
            opponentId: opponent.id,
            opponentName: opponent.username,
            opponentEnergy: 3,
            channelId: channel.id,
            challengerHealth: 3,
            opponentHealth: 3,
            currentPlayerId: currentPlayerId, // Start with the challenger
            currentPlayerName: currentPlayerName
        };

        // Save initial game state
        await saveGameData(gameData, gameFilename);

        // Start the game
        await herodraft(challenger, opponent, channel, gameFilename);
    }

    else if (interaction.customId.startsWith('herodraft_')) {
        const [, actionType, gameFilename] = interaction.customId.split('_'); // Extract filename

        let gameData = await loadGameData(gameFilename);
        const { currentPlayerId, challengerId, currentPlayerName } = gameData;

        if (!gameData) {
            await interaction.reply({ content: "Could not load game data.", ephemeral: true });
            return;
        }
        console.log('actionType', actionType)
        if (interaction.user.id !== currentPlayerId) {
            await interaction.reply({ content: `It's not your turn!`, ephemeral: true });
            return
        }
        // **** ATTACK HANDLER ****
        if (actionType === 'attack') {
            if (currentPlayerId === challengerId) {
                gameData.opponentHealth -= 1;
                console.log('reducing opponent Health')
            } else {
                gameData.challengerHealth -= 1;
                console.log('reducing challenger Health')
            }
            gameData = swapPlayers(gameData)
            await saveGameData(gameData, gameFilename);
            await interaction.update({ components: [] })
            await interaction.followUp(`${currentPlayerName.toString()} attacked and dealt 1 damage!`);
        }
        // **** PASS HANDLER ****
        else if (actionType === 'pass') {
            gameData = swapPlayers(gameData)
            await saveGameData(gameData, gameFilename);
            await interaction.update({ components: [] })
            await interaction.followUp(`${currentPlayerName.toString()} passed their turn...`);
        }
        return
    }
});

async function startHerodraft(message, draftSize) {
    // Create the button 
    const button = new ButtonBuilder()
        .setLabel('Accept Challenge')
        .setStyle(ButtonStyle.Success)
        .setCustomId('herodraft_accept');

    // Create the Action Row
    const view = new ActionRowBuilder()
        .addComponents(button);

    const challengeMsg = await message.channel.send({
        content: `${message.author.toString()} has issued a Hero Draft challenge!`,
        components: [view]
    });
}


async function handleResignation(message) {
    gameInProgress = false
    await channel.send(`${message.author()} has resigned!`);
}

async function herodraft(challenger, opponent, channel, gameFilename) {
    await channel.send(`The game between ${challenger.username} and ${opponent.username} begins!`);
    const energyBarLength = 10;

    let gameData = await loadGameData(gameFilename);

    combineImages()

    while (true) {
        let gameData = await loadGameData(gameFilename);
        const { currentPlayerName, activeChallengerHero, activeOpponentHero, challengerEnergy, opponentEnergy, challengerHealth, challengerName, opponentHealth, opponentName, channelId } = gameData;

        if (challengerHealth <= 0) {
            await channel.send(`${challengerName} has lost!`);
            gameInProgress = false
            break;
        } else if (opponentHealth <= 0) {
            await channel.send(`${opponentName} has lost!`);
            gameInProgress = false;
            break;
        }

        const challengerCombatImagePath = './assets/' + activeChallengerHero + 'Combat.png'
        const opponentCombatImagePath = './assets/' + activeOpponentHero + 'Combat.png'
        const testpath = './assets/test.png'
        const challengerImage = fs.readFileSync(challengerCombatImagePath);
        const opponentImage = fs.readFileSync(opponentCombatImagePath);
        const testimage = fs.readFileSync(testpath);
        const challengerEnergyBar = " [" + "⚡️".repeat(challengerEnergy) + "-".repeat(energyBarLength - challengerEnergy) + "] ";
        const opponentEnergyBar = " [" + "⚡️".repeat(opponentEnergy) + "-".repeat(energyBarLength - opponentEnergy) + "] ";

        const TitleEmbed = new EmbedBuilder().setTitle(`${currentPlayerName}'s Turn`)
        await channel.send({ embeds: [TitleEmbed] })

        const embed = new EmbedBuilder()
            .addFields(
                { name: activeChallengerHero, value: `${challengerHealth} HP`, inline: true },
                { name: activeOpponentHero, value: `${opponentHealth} HP`, inline: true },
                { name: '\u200b', value: '\u200b ', inline: true }, // Add an empty field for spacing
                { name: challengerName, value: challengerEnergyBar, inline: true },
                { name: opponentName, value: opponentEnergyBar, inline: true },
            )
            //.setThumbnail('attachment://' + challengerCombatImagePath) // Challenger on left
            //.setImage('attachment://' + opponentCombatImagePath);   // Opponent on right
            .setImage('attachment://' + testpath);

        const attackButton = new ButtonBuilder()
            .setLabel('Attack')
            .setStyle(ButtonStyle.Danger)
            .setCustomId(`herodraft_attack_${gameFilename}`);

        const abilityButton = new ButtonBuilder()
            .setLabel('Ability')
            .setStyle(ButtonStyle.Primary)
            .setCustomId(`herodraft_ability_${gameFilename}`);

        const switchButton = new ButtonBuilder()
            .setLabel('Switch')
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(`herodraft_switch_${gameFilename}`);

        const view = new ActionRowBuilder()
            .addComponents(attackButton, abilityButton, switchButton);

        await channel.send({
            embeds: [embed],
            files: [
                //new AttachmentBuilder(challengerImage, { name:  }),
                new AttachmentBuilder(testimage, { name: testpath })
            ],
            components: [view]
        });

        // Wait for interaction
        try {
            const filter = (m) => {
                if (m.author.username.includes('checkmage-bot') &&
                    m.channelId.includes(channelId)) {
                    return true;
                }
            }
            await channel.awaitMessages({ filter, max: 1, time: 60_0000, errors: ['time'] })

        } catch (error) {
            if (error.name === 'TimeoutError') {
                await channel.send(`${currentPlayerName} took too long to decide!`);
            } else {
                console.error("Error waiting for interaction:", error);
            }
        }
    }
}


async function calculateRollResult(rollString, message) {
    // Regular Expression (mostly unchanged)
    const dicePattern = /(\d+d\d+)(?:\s*(\+|-)\s*(\d+d\d+|\d+))?/g;

    let longMess = false;
    const rolls = [];
    let total = 0;
    let difficulty = 1;
    let maxroll = 0;

    // Find all dice patterns using the regular expression
    let match;
    while ((match = dicePattern.exec(rollString)) !== null) {
        const [_, numDiceStr, operator, modifierStr] = match; // Destructure the match results
        const numDice = parseInt(numDiceStr.split('d')[0]);
        const dieType = parseInt(numDiceStr.split('d')[1]);

        difficulty *= numDice * dieType;
        maxroll += numDice * dieType;

        if (numDice > 1) {
            longMess = true;
        }

        // Generate individual die rolls
        const roll = [];
        for (let i = 0; i < numDice; i++) {
            roll.push(Math.floor(Math.random() * dieType) + 1);
        }
        rolls.push(roll);
        total += roll.reduce((sum, val) => sum + val, 0); // Calculate the sum of the roll

        // Process Modifier (if present)
        if (operator) {
            if (operator === '+' && modifierStr.match(/^\d+$/)) { // Check for flat number modifier
                maxroll += parseInt(modifierStr);
                total += parseInt(modifierStr);
            } else if (modifierStr.match(/\d+d\d+/)) {      // Check for another dice roll modifier
                const [modNumDiceStr, modDieTypeStr] = modifierStr.split('d');
                const modNumDice = parseInt(modNumDiceStr);
                const modDieType = parseInt(modDieTypeStr);

                difficulty *= modNumDice * modDieType;
                maxroll += modNumDice * modDieType;

                const modRoll = [];
                for (let i = 0; i < modNumDice; i++) {
                    modRoll.push(Math.floor(Math.random() * modDieType) + 1);
                }
                rolls.push(modRoll);

                if (operator === '+') {
                    total += modRoll.reduce((sum, val) => sum + val, 0);
                } else {
                    total -= modRoll.reduce((sum, val) => sum + val, 0);
                }
            }
        }
    }

    // Construct Output Message
    let output = `${message.author.toString()} rolled `;

    if (longMess) {
        output += `(${rolls.flat().join(', ')}) `; // Flatten the 'rolls' array
    }
    output += `Total: ${total}!`;

    // Critical Success/Failure
    if (difficulty >= 20) {
        if (total === maxroll) {
            output += " CRITICAL SUCCESS!";
        } else if (total === rolls.length) { // Note the slight change here
            output += " Critical Failure...";
        }
    }

    await message.channel.send(output);
}

async function calculateTriviaStats(channel) {
    const userScores = {};
    const triviaBotId = '...'; // Replace '...' with the actual ID of your Trivia Bot

    try {
        const messages = await channel.messages.fetch({ limit: 10 }); // Fetch recent messages

        for (const message of messages.values()) {
            if (message.author.id !== triviaBotId) continue; // Check if it's the trivia bot

            const referencedMessage = await message.fetchReference();
            if (!referencedMessage) continue;

            const username = referencedMessage.content.split(' ')[0];

            if (!userScores[username]) {
                userScores[username] = { correct: 0, total: 0 };
            }

            userScores[username]['total']++;
            if (message.content.includes('Correct!')) {
                userScores[username]['correct']++;
            }
        }

        // Build the stats message
        let statsMessage = "Trivia Stats:\n";
        for (const [username, scores] of Object.entries(userScores)) { // Using Object.entries()
            const accuracy = scores['total'] ? round(scores['correct'] / scores['total'] * 100, 1) : 0;
            statsMessage += `- ${username}: ${scores['correct']}/${scores['total']} (${accuracy}%)\n`;
        }

        console.log(statsMessage);
        // You'll likely want to send the `statsMessage` to the channel: 
        // await channel.send(statsMessage); 

    } catch (error) {
        console.error("Error fetching or processing messages:", error);
    }
}

async function createWeeklyCalendarMessage(channel, dayOffset = 3) {
    /**
     * Fetches the most recent session number from channel history
     */
    async function findSessionNumber(channel) {
        try {
            const messages = await channel.messages.fetch({ limit: 50 });
            for (const message of messages.values()) {
                if (message.content.startsWith("Session ")) {
                    const parts = message.content.split(" ");
                    if (parts.length >= 2) {
                        let sessionStr = parts[1];
                        if (sessionStr.endsWith(":")) {
                            sessionStr = sessionStr.slice(0, -1); // Remove the colon
                        }
                        if (/\d+/.test(sessionStr)) { // Simple check if it's a number
                            return parseInt(sessionStr);
                        }
                    }
                }
            }
            return null; // No session message found
        } catch (error) {
            console.error("Error fetching session number:", error);
            return null;
        }
    }

    let sessionNumber = await findSessionNumber(channel);
    if (sessionNumber === null) {
        sessionNumber = 13; // Default starting session number
    }

    const now = new Date();
    const dayAdjustment = (dayOffset - now.getDay() + 7) % 7;
    const targetDay = new Date(now.getTime() + dayAdjustment * 24 * 60 * 60 * 1000);
    targetDay.setHours(18, 0, 0); // Set to 6 PM

    let startTimestamp = Math.floor(targetDay.getTime() / 1000); // Unix timestamp in seconds
    let endTimestamp = startTimestamp + 3 * 60 * 60;

    // Create the message content (Discord timestamp formatting might need an alternative)
    const message = `
    Session ${sessionNumber + 1}: 
    Next Session: <t:${startTimestamp}> - <t:${endTimestamp}:t>
    which is <t:${startTimestamp}:R>! 
    `;

    // Send the message
    await channel.send(message);
}

function round(number, decimalPlaces) {
    const factor = 10 ** decimalPlaces;
    return Math.round(number * factor) / factor;
}

if (TOKEN) {
    client.login(TOKEN);
} else {
    console.error("No Discord bot token provided.");
}