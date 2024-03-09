import discord
import os
import re
import datetime
import random
import json
import asyncio
from discord.ui import Button, View 
from dotenv import load_dotenv

print(discord.__version__)

load_dotenv()  # Load environment variables from a .env file (explained below)
TOKEN = os.getenv('DISCORD_TOKEN')  # Get your bot token
game_in_progress = False

# Specify Intents
intents = discord.Intents.default()  # For basic functionality
intents.message_content = True  # Make sure to include message_content 

client = discord.Client(intents=intents)

@client.event
async def on_ready():
  print(f'{client.user} has connected to Discord!')

@client.event
async def on_message(message):
    if message.author == client.user:  # Prevent the bot from responding to itself
        return
    if game_in_progress:  # You'll need to define this function 
        if message.content.startswith('!resign') or message.content.startswith('!ff'):
            await handle_resignation(message)  # Define handle_resignation function
            await message.delete()
        return  # Ignore all other commands during a game 
    elif message.content.startswith('!thursday'):
        await create_weekly_calendar_message(message.channel, day_offset=3)  # Send to trigger channel
        await message.delete()  # Delete the trigger message
    elif message.content.startswith('!friday'): 
        await create_weekly_calendar_message(message.channel, day_offset=4)  # Send to trigger channel
        await message.delete()  # Delete the trigger message
    elif message.content.startswith('!triviastats'): 
        await calculate_trivia_stats(message.channel) 
        await message.delete() 
    elif message.content.startswith('!herodraft3'):
        await start_herodraft(message, draft_size=3) 
    elif message.content.startswith('!herodraft5'):
        await start_herodraft(message, draft_size=5)  
    elif message.content.startswith('!roll'):
        await calculate_roll_result(message.content[5:], message)

@client.event
async def start_herodraft(message, draft_size):
    button = Button(label="Accept Challenge", style=discord.ButtonStyle.green)
    view = View(timeout=60)  # Timeout the challenge after 60 seconds
    view.add_item(button) 

    challenge_msg = await message.channel.send(f"{message.author.mention} has issued a Hero Draft challenge!", view=view)

    async def button_callback(interaction):  # Define callback for button press
        global game_in_progress  # Indicate game is now starting
        game_in_progress = True

        challenger = message.author
        opponent = interaction.user

        if challenger == opponent:  # Check for self-battle attempt
            await interaction.response.send_message("You cannot battle yourself!", ephemeral=True)
            return  # Prevent the game from starting

        # Embed is better for game start announcements
        embed = discord.Embed(title="Game Starting!", 
                              description=f"{challenger.mention} vs {opponent.mention}")
        await interaction.response.edit_message(content=None, embed=embed, view=None)  # Remove the button 

        # Start the game logic (replace with your game-specific function)
        await herodraft(challenger, opponent, message.channel)

    button.callback = button_callback  # Assign the callback to the button

async def herodraft(challenger, opponent, channel):
    await channel.send(f"The game between {challenger.mention} and {opponent.mention} begins!")
    current_player = challenger
    challenger_health = 3
    opponent_health = 3

    if random.randint(0, 1) == 0:
        current_player = challenger
        await channel.send(f"{challenger.mention} won the coin toss and goes first!")
    else:
        current_player = opponent
        await channel.send(f"{opponent.mention} won the coin toss and goes first!")

    while True:  # Main game loop
        embed = discord.Embed(title=f"{current_player.mention}'s Turn",
                              description=f"**Challenger:** {challenger_health} HP\n"
                                          f"**Opponent:** {opponent_health} HP")

        attack_button = discord.ui.Button(label="Attack", style=discord.ButtonStyle.red)
        pass_button = discord.ui.Button(label="Pass", style=discord.ButtonStyle.grey)
        view = discord.ui.View()  # Create a View to hold the buttons
        view.add_item(attack_button)
        view.add_item(pass_button)

        await channel.send(embed=embed, view=view)

        async def button_callback(interaction):
            nonlocal challenger_health, opponent_health, current_player 

            if interaction.user != current_player:
                await interaction.response.send_message("It's not your turn!", ephemeral=True)
                return

            if interaction.component.label == "Attack":
                if current_player == challenger:
                    opponent_health -= 1
                else:
                    challenger_health -= 1

                await interaction.response.edit_message(content=f"{interaction.user.mention} attacked!", view=None)
            
            if interaction.component.label == "Pass":
                await interaction.response.edit_message(content=f"{interaction.user.mention} passed their turn.", view=None)

            # Switch turns
            current_player = opponent if current_player == challenger else challenger 

            # Check for win condition
        if opponent_health <= 0:
            await channel.send(f"{challenger.mention} wins!")
            break
        elif challenger_health <= 0:
            await channel.send(f"{opponent.mention} wins!")
            break

        attack_button.callback = button_callback
        pass_button.callback = button_callback

        challenge_msg = await message.channel.send(f"{message.author.mention} has issued a Hero Draft challenge!", view=view)

        try:
            interaction = await client.wait_for('interaction', check=lambda i: i.message.id == challenge_msg.id, timeout=60)  
            await button_callback(interaction)  # Process the interaction
        except asyncio.TimeoutError:
            await channel.send("Challenge timed out due to inactivity.") 

@client.event
async def handle_resignation(message):
    global game_in_progress
    game_in_progress = False
@client.event
async def calculate_roll_result(roll_string, message):
    dice_pattern = re.compile(r'(\d+d\d+)(?:\s*(\+|-)\s*(\d+d\d+|\d+))?')  # Modified pattern
    longMess = False
    rolls = []
    total = 0
    difficulty = 1
    maxroll = 0

    for part in dice_pattern.findall(roll_string):
        num_dice, die_type = map(int, part[0].split('d'))
        difficulty = difficulty * num_dice * die_type  # Calculate difficulty
        maxroll += num_dice * die_type
        if(num_dice > 1):
            longMess = True
        rolls.append([random.randint(1, die_type) for _ in range(num_dice)])
        total += sum(rolls[-1])

        if part[1]:  # If a modifier exists 
            if part[1] == '+':
                if part[2].isdigit():  # Check for a flat number
                    maxroll += int(part[2])
                    total += int(part[2])
                else: 
                    num_dice, die_type = map(int, part[2].split('d'))
                    difficulty = difficulty * num_dice * die_type
                    maxroll += num_dice * die_type
                    rolls.append([random.randint(1, die_type) for _ in range(num_dice)])
                    total += sum(rolls[-1])
            elif part[1] == '-':
                if part[2].isdigit(): 
                    maxroll -= int(part[2])
                    total -= int(part[2])
                else: 
                    num_dice, die_type = map(int, part[2].split('d'))
                    difficulty = difficulty * num_dice * die_type
                    maxroll += num_dice * die_type
                    rolls.append([random.randint(1, die_type) for _ in range(num_dice)])
                    total -= sum(rolls[-1])

    output = f"{message.author.mention} rolled "
    if len(rolls) > 1:
        longMess = True

    if longMess:  
        output += f"({', '.join(map(str, sum(rolls, [])))}) "  
        output += f"Total: {total}!" 
    else:
        output += f"{total}!"

    if difficulty >= 20:
        if total == maxroll:
            output += " CRITICAL SUCCESS!"
        elif total == 1 * len(rolls):  # Check if each die rolled its minimum value
            output += " Critical Failure..."
          
    await message.channel.send(output) 
@client.event
async def calculate_trivia_stats(channel):
    user_scores = {}

    async for message in channel.history(limit=10):  # Fetch all history
        if message.author.equals('trivia-bot'):  # Check if it's the trivia bot's response
            print('bot message:', message.content)
            referenced_message = await message.channel.fetch_message(message.reference.message_id)
            print('ref message:', referenced_message)
            username = referenced_message.content.split()[0]  # Extract username from '/question'

            if username not in user_scores:
                user_scores[username] = {'correct': 0, 'total': 0} 

            user_scores[username]['total'] += 1
            if 'Correct!' in message.content:
                user_scores[username]['correct'] += 1

    # Build the stats message
    stats_message = "Trivia Stats:\n"
    for username, scores in user_scores.items():
        accuracy = round(scores['correct'] / scores['total'] * 100, 1) if scores['total'] else 0
        stats_message += f"- {username}: {scores['correct']}/{scores['total']} ({accuracy}%)\n"  # Indent

    print(stats_message)
@client.event
async def create_weekly_calendar_message(channel, start_timestamp=None, day_offset=3):
    """
    Creates and sends a weekly calendar message to the specified channel.

    Args:
        channel (discord.TextChannel): The channel to send the message to.
        session_number (int, optional): The starting session number. Defaults to 13.
        start_timestamp (int, optional): A Unix timestamp to start from. If not
                                        provided, the next Thursday will be used.
    """
    async def find_session_number(channel):
        """Fetches the most recent session number from channel history"""
        async for msg in channel.history(limit=50):  
            if msg.content.startswith("Session "):
                parts = msg.content.split()  
                if len(parts) >= 2:
                    session_str = parts[1]
                    if session_str.endswith(":"):  # Check for the colon
                        session_str = session_str[:-1]  # Remove the colon
                    if session_str.isdigit():
                        return int(session_str)
                return None  
        return None  # No session message found

    session_number = await find_session_number(channel)
    if session_number is None:
        session_number = 13  # Default starting session number

    # Calculate timestamps for next Thursday
    if start_timestamp is None:
        now = datetime.datetime.now()
        day_adjustment = (day_offset - now.weekday() + 7) % 7  # Adjusted calculation
        target_day = now + datetime.timedelta(days=day_adjustment)
        start_timestamp = int(target_day.replace(hour=18, minute=0, second=0).timestamp())
        end_timestamp = int(target_day.replace(hour=21, minute=0, second=0).timestamp())


    # Create the message content
    message = f"""
    Session {session_number+1}: 
    Next Session: <t:{start_timestamp}> - <t:{end_timestamp}:t>
    which is <t:{start_timestamp}:R>!
    """

    # Send the message
    await channel.send(message)

if TOKEN is not None:
  client.run(TOKEN)
else:
  print("No token provided.")
