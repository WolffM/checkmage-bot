// Install necessary libraries (using npm or yarn)
const Discord = require('discord.js');
const dotenv = require('dotenv');

// ... Environment Variable Setup (dotenv) ...

const client = new Discord.Client({ intents: [Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.GuildMessages, Discord.GatewayIntentBits.MessageContent] });
let gameInProgress = false;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => { // Updated event name
  if (message.author.bot) return; 

  if (gameInProgress) {
    if (message.content.startsWith('!resign') || message.content.startsWith('!ff')) {
      await handleResignation(message);
      await message.delete();
    }
    return; 
  } else if (message.content.startsWith('!thursday')) {
    await createWeeklyCalendarMessage(message.channel, 3); 
    await message.delete(); 
  } else if (message.content.startsWith('!friday')) {
    await createWeeklyCalendarMessage(message.channel, 4); 
    await message.delete();
  } else if (message.content.startsWith('!triviastats')) {
    await calculateTriviaStats(message.channel);
    await message.delete();
  } else if (message.content.startsWith('!herodraft3')) {
    await startHerodraft(message, 3);
  } else if (message.content.startsWith('!herodraft5')) {
    await startHerodraft(message, 5);
  } else if (message.content.startsWith('!roll')) {
    await calculateRollResult(message.content.slice(5), message); // slice to remove '!roll'
  } 
});

async function startHerodraft(message, draftSize) {
  const button = new Discord.ButtonBuilder()
      .setLabel('Accept Challenge')
      .setStyle(Discord.ButtonStyle.Success)
      .setCustomId('accept'); // You'll need an interaction handler

  const view = new Discord.ActionRowBuilder()
      .addComponents(button); 

  const challengeMsg = await message.channel.send({ 
      content: `${message.author.toString()} has issued a Hero Draft challenge!`, 
      components: [view] 
  });

  // ... Interaction Handling (explained later) ...
}

async function herodraft(challenger, opponent, channel) {
  await channel.send(`The game between ${challenger.toString()} and ${opponent.toString()} begins!`);

  let currentPlayer = challenger;
  let challengerHealth = 3;
  let opponentHealth = 3;

  if (Math.random() < 0.5) {
    currentPlayer = challenger;
    await channel.send(`${challenger.toString()} won the coin toss and goes first!`);
  } else {
    currentPlayer = opponent;
    await channel.send(`${opponent.toString()} won the coin toss and goes first!`);
  }

  while (true) { 
    const embed = new Discord.EmbedBuilder()
      .setTitle(`${currentPlayer.toString()}'s Turn`)
      .setDescription(`**Challenger:** ${challengerHealth} HP\n**Opponent:** ${opponentHealth} HP`);

    // ... Create Attack/Pass buttons with custom IDs ...

    const view = new Discord.ActionRowBuilder()
      .addComponents(/* your buttons */);

    const sentMessage = await channel.send({ embeds: [embed], components: [view] });

    // ... Interaction Handling (explained below) ...
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

async function createWeeklyCalendarMessage(channel, startTimestamp = null, dayOffset = 3) {
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
    
    // Calculate timestamps for next Thursday
    if (startTimestamp === null) {
        const now = new Date();
        const dayAdjustment = (dayOffset - now.getDay() + 7) % 7; 
        const targetDay = new Date(now.getTime() + dayAdjustment * 24 * 60 * 60 * 1000);
        targetDay.setHours(18, 0, 0); // Set to 6 PM
    
        startTimestamp = Math.floor(targetDay.getTime() / 1000); // Unix timestamp in seconds
        endTimestamp = startTimestamp + 3 * 60 * 60; // Add 3 hours
    }
    
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