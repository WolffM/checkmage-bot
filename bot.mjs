import { saveGameData, saveGameDataFields, loadGameData } from './saveData.mjs';
import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import { combineImagesForCombat, combineImagesForDraft, shuffleArray, initializeTeamFile } from './helper.mjs';
const str = 'Mozilla';

dotenv.config();
const TOKEN = process.env.DISCORD_TOKEN;
let gameInProgress, challengerStarterChosen, opponentStarterChosen;
let skipDraft = true;
let interactionsReceived = 0
let draftRound = 1;
let currentPlayerId, otherPlayerId, otherPlayerName, currentPlayerName, challengerId, challengerName, opponentId, opponentName = '';

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

    else if (interaction.customId === 'herodraft_start') {

    } else if (interaction.customId.startsWith('draft_')) {
        const [, choice] = interaction.customId.split('_'); // Extract filename

        if (interaction.user.id !== currentPlayerId) {
            await interaction.reply({ content: `It's not your turn!`, ephemeral: true });
            return
        }

        const heroData = JSON.parse(fs.readFileSync('./assets/hero_data.json'));
        console.log(`${currentPlayerName} chooses`, choice)
        const selectedHero = heroData.heroes.find(hero => hero.name === choice);

        if (!selectedHero) {
            console.error('Could not find matching hero!');
            return;
        }

        // Load team file
        const teamFilename = `./genassets/teams/${currentPlayerName}_team.json`;
        const teamData = JSON.parse(fs.readFileSync(teamFilename));
        teamData.team.push(selectedHero);
        fs.writeFileSync(teamFilename, JSON.stringify(teamData));
        const components = interaction.message.components;
        const newEmbed = new EmbedBuilder(); // Create new embed using existing data
        newEmbed.setTitle(`${otherPlayerName}'s draft pick`);

        if (interactionsReceived < 2) {
            const buttonToRemove = components[0].components.find(button => button.data.custom_id === interaction.customId);
            if (buttonToRemove) {
                const buttonIndex = components[0].components.indexOf(buttonToRemove);
                components[0].components.splice(buttonIndex, 1);
                await interaction.update({ embeds: [newEmbed], components: components })
            } else {
                console.error("Couldn't find matching button to remove");
            }
        } else {
            const embed = new EmbedBuilder()
                .setTitle(`(draft round #${draftRound})`)
            draftRound++
            await interaction.update({ embeds: [embed], components: [] })
            console.log('ending interaction')
        }
    }

    else if(interaction.customId.startsWith('startselect_')){
        const [, playerId, heroName] = interaction.customId.split('_'); // Extract filename
        console.log(`playerId + heroName + interactionid : ${playerId} + ${heroName} + ${interaction.user.id}`)
        if (interaction.user.id !== playerId) {
            await interaction.reply({ content: `That's not your team!`, ephemeral: true });
            return
        }
        if(playerId == challengerId){
            challengerStarterChosen = heroName;
        } else{
            opponentStarterChosen = heroName;
        }
        interactionsReceived++
        console.log('interactionsReceived')
        interaction.update({ content: 'Choice registered!', components: [], ephemeral: true });
    }

    else if (interaction.customId === 'herodraft_accept') {
        const opponent = interaction.user;
        const channel = interaction.channel
        let challenger = null;

        // Fetch recent messages to find the challenge
        const messages = await interaction.channel.messages.fetch({ limit: 10 }); // Adjust limit if needed
        const challengeMessage = messages.find(msg => msg.content.startsWith('!herodraft'));
        const draftSize = challengeMessage.toString().split('!herodraft')[1]

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
            .setTitle('Draft Starting!')
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

        challengerId = challenger.id;
        challengerName = challenger.username;
        opponentId = opponent.id;
        opponentName = opponent.username;

        if (Math.random() < 0.5) {
            currentPlayerId = challenger.id;
            currentPlayerName = challenger.username;
            otherPlayerId = opponent.id;
            otherPlayerName = opponent.username;
            await channel.send(`${challenger.username.toString()} won the coin toss and goes first!`);
        } else {
            currentPlayerId = opponent.id;
            currentPlayerName = opponent.username
            otherPlayerId = challenger.id;
            otherPlayerName = challenger.username;
            await channel.send(`${opponent.username.toString()} won the coin toss and goes first!`);
        }

        // Initialize game data
        const gameData = {
            activeChallengerHero: '',
            activeOpponentHero: '',
            challengerEnergy: 3,
            opponentEnergy: 3,
            channelId: channel.id,
            challengerHealth: 3,
            opponentHealth: 3,
        };

        // Save initial game state
        await saveGameData(gameData, gameFilename);

        // Start the game
        await heroDraft(channel, parseInt(draftSize), gameFilename);
    }

    else if (interaction.customId.startsWith('herodraft_')) {
        const [, actionType, gameFilename] = interaction.customId.split('_'); // Extract filename

        let gameData = await loadGameData(gameFilename);

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
            swapPlayers()
            await interaction.update({ components: [] })
            await interaction.followUp(`${currentPlayerName.toString()} attacked and dealt 1 damage!`);
        }
        // **** PASS HANDLER ****
        else if (actionType === 'pass') {
            swapPlayers();
            await interaction.update({ components: [] })
            await interaction.followUp(`${currentPlayerName.toString()} passed their turn...`);
        }
        return
    }
});

export function swapPlayers() {
    const tempPlayerId = currentPlayerId;
    const tempPlayerName = currentPlayerName;
    currentPlayerId = otherPlayerId;
    otherPlayerId = tempPlayerId;
    currentPlayerName = otherPlayerName;
    otherPlayerName = tempPlayerName;
}

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

async function heroDraft(channel, draftSize, gameFilename) {
    if (!skipDraft) {

        await channel.send(`The draft between ${challengerName} and ${opponentName} begins!`);

        initializeTeamFile(`./genassets/teams/${challengerName}_team.json`);
        initializeTeamFile(`./genassets/teams/${opponentName}_team.json`);

        // Load hero data
        const heroData = JSON.parse(fs.readFileSync('./assets/hero_data.json'));
        const imagePromises = [];
        let draftPool = [...heroData.heroes];

        shuffleArray(draftPool); // Shuffle the hero pool

        console.log('draftsize:', draftSize)


        for (let i = 0; i < draftSize * 3; i += 3) { // Loop for each draft set
            const hero1 = draftPool[i];
            const hero2 = draftPool[i + 1];
            const hero3 = draftPool[i + 2];

            const hero1Path = './assets/' + hero1.name + 'Combat.png'
            const hero2Path = './assets/' + hero2.name + 'Combat.png'
            const hero3Path = './assets/' + hero3.name + 'Combat.png'
            console.log(`building: './genassets/' + ${hero1.name} + '+' + ${hero2.name} + '+' + ${hero3.name} + 'Draft.png'`)
            const outputImagePath = './genassets/' + hero1.name + '+' + hero2.name + '+' + hero3.name + 'Draft.png';
            const imagePromise = combineImagesForDraft(hero1Path, hero2Path, hero3Path, outputImagePath)
            imagePromises.push(imagePromise);
        }

        for (const imagePromise of imagePromises) {
            const firstGeneratedImage = await imagePromise;
            if (firstGeneratedImage) break; // Got the image
        }

        for (let j = 0; j < draftSize * 3; j += 3) {
            const hero1 = draftPool[j];
            const hero2 = draftPool[j + 1];
            const hero3 = draftPool[j + 2];
            const draftImagePath = './genassets/' + hero1.name + '+' + hero2.name + '+' + hero3.name + 'Draft.png';

            const embed = new EmbedBuilder()
                .setTitle(`${currentPlayerName}'s draft pick`)
                .setImage('attachment://' + draftImagePath);

            // Setup buttons using hero names (You'll need the images)
            const view = new ActionRowBuilder()
                .addComponents([
                    new ButtonBuilder().setLabel(hero1.name).setStyle(ButtonStyle.Success).setCustomId(`draft_${hero1.name}_${gameFilename}`),
                    new ButtonBuilder().setLabel(hero2.name).setStyle(ButtonStyle.Success).setCustomId(`draft_${hero2.name}_${gameFilename}`),
                    new ButtonBuilder().setLabel(hero3.name).setStyle(ButtonStyle.Success).setCustomId(`draft_${hero3.name}_${gameFilename}`)
                ]);

            const message = await channel.send({
                embeds: [embed],
                files: [
                    new AttachmentBuilder(fs.readFileSync(draftImagePath), { name: draftImagePath })
                ],
                components: [view]
            });

            while (interactionsReceived < 2) {
                const filter = (i) => i.customId.startsWith('draft_') && currentPlayerId == i.user.id;
                const buttonInteraction = await message.awaitMessageComponent({ filter, time: 600000 /* Timeout */ })
                    .catch(error => {
                        console.error('Draft timeout or error:', error);
                        return null;
                    });

                if (!buttonInteraction) continue; // Timeout or error

                swapPlayers()
                console.log('interactionsReceived')
                interactionsReceived++;
            }

            interactionsReceived = 0;
        }
    }

    console.log('opponentId', opponentId)
    console.log('opponentName', opponentName)
    console.log('challengerId', challengerId)
    console.log('challengerName', challengerName)


    const challengerSelection = await channel.send({
        content: `${challengerName}'s starting hero selection...`,
        components: [
            createHeroSelectionButtons(challengerName, challengerId, gameFilename)
        ],
    });

    const opponentSelection = await channel.send({
        content: `${opponentName}'s starting hero selection...`,
        components: [
            createHeroSelectionButtons(opponentName, opponentId, gameFilename)
        ],
    });

    interactionsReceived = 0;
    while (interactionsReceived < 2) {
        const challengerButtonInteraction = await challengerSelection.awaitMessageComponent({ filter: i => i.user.id === challengerId && i.customId.startsWith('startselect_'), time: 600000 })
        const opponentButtonInteraction = await opponentSelection.awaitMessageComponent({ filter: i => i.user.id === opponentId && i.customId.startsWith('startselect_'), time: 600000 })
        if (!challengerButtonInteraction || !opponentButtonInteraction) continue; // Timeout or error
    }

    // At this point, you should have both choices (or a timeout has occurred)
    if (opponentStarterChosen && challengerStarterChosen) {
        await saveGameDataFields(gameFilename, {
            activeChallengerHero: challengerStarterChosen,
            activeOpponentHero: opponentStarterChosen
        });
    } else {
        console.log(`failed to get both hero's ):`)
    }

    heroGame(channel, gameFilename)
}


async function heroGame(channel, gameFilename) {
    await channel.send(`The game between ${challengerName} and ${opponentName} begins!`);
    const energyBarLength = 10;
    let turnCount = 1;

    while (true) {
        let gameData = await loadGameData(gameFilename);
        const { activeChallengerHero, activeOpponentHero, challengerEnergy, opponentEnergy, challengerHealth, opponentHealth, channelId } = gameData;

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
        const outputCombatImagePath = './genassets/' + activeChallengerHero + '_vs_' + activeOpponentHero + 'Combat.png'
        //const challengerImage = fs.readFileSync(challengerCombatImagePath);
        //const opponentImage = fs.readFileSync(opponentCombatImagePath);
        const challengerEnergyBar = " [" + "⚡️".repeat(challengerEnergy) + "-".repeat(energyBarLength - challengerEnergy) + "] ";
        const opponentEnergyBar = " [" + "⚡️".repeat(opponentEnergy) + "-".repeat(energyBarLength - opponentEnergy) + "] ";

        if (!fs.existsSync(outputCombatImagePath)) {
            await combineImagesForCombat(opponentCombatImagePath, challengerCombatImagePath, outputCombatImagePath)
        }

        const outputImage = fs.readFileSync(outputCombatImagePath);

        const TitleEmbed = new EmbedBuilder().setTitle(`${currentPlayerName}'s Turn`)
        await channel.send({ embeds: [TitleEmbed] })

        const embed = new EmbedBuilder()
            .addFields(
                { name: activeChallengerHero, value: `${challengerHealth} HP`, inline: true },
                { name: '\u200b', value: '\u200b ', inline: true }, // Add an empty field for spacing
                { name: activeOpponentHero, value: `${opponentHealth} HP`, inline: true },
                { name: challengerName, value: challengerEnergyBar, inline: true },
                { name: '\u200b', value: '\u200b ', inline: true }, // Add an empty field for spacing
                { name: opponentName, value: opponentEnergyBar, inline: true },
            )
            //.setThumbnail('attachment://' + challengerCombatImagePath) // Challenger on left
            //.setImage('attachment://' + opponentCombatImagePath);   // Opponent on right
            .setImage('attachment://' + outputCombatImagePath)
            .setTitle(`Turn ${turnCount} \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B \u200B`);

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
                new AttachmentBuilder(outputImage, { name: outputCombatImagePath })
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
            await channel.awaitMessages({ filter, max: 1, time: 600_0000, errors: ['time'] })

        } catch (error) {
            if (error.name === 'TimeoutError') {
                await channel.send(`${currentPlayerName} took too long to decide!`);
            } else {
                console.error("Error waiting for interaction:", error);
            }
        }
    }
}

function createHeroSelectionButtons(playerName, playerId, gameFilename) {
    const teamFilename = `./genassets/teams/${playerName}_team.json`;
    const teamData = JSON.parse(fs.readFileSync(teamFilename));

    const buttons = teamData.team.map(hero =>
        new ButtonBuilder()
            .setLabel(hero.name)
            .setStyle(ButtonStyle.Success)
            .setCustomId(`startselect_${playerId}_${hero.name}_${gameFilename}`)
    );

    return new ActionRowBuilder().addComponents(buttons);
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