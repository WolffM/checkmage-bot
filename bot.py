import discord
import os
import re
import datetime
import random
import json

from dotenv import load_dotenv

load_dotenv()  # Load environment variables from a .env file (explained below)
TOKEN = os.getenv('DISCORD_TOKEN')  # Get your bot token

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

    if message.content.startswith('!thursday'):
        await create_weekly_calendar_message(message.channel, day_offset=3)  # Send to trigger channel
        await message.delete()  # Delete the trigger message

    elif message.content.startswith('!friday'): 
        await create_weekly_calendar_message(message.channel, day_offset=4)  # Send to trigger channel
        await message.delete()  # Delete the trigger message
    elif message.content.startswith('!triviastats'): 
        await calculate_trivia_stats(message.channel) 
        await message.delete() 
    elif message.content.startswith('!herodraft3'):
        await start_herodraft(message, draft_size=3)  # We'll need to define the start_game function 
        await message.delete() 
    elif message.content.startswith('!herodraft5'):
        await start_herodraft(message, draft_size=5)  
        await message.delete()
    elif message.content.startswith('!roll'):
        await calculate_roll_result(message.content[5:], message)
    elif message.content.startswith('!fetch'):
        message_id = message.content.split(' ')[1] 
        message_json = await fetch_message_json(message_id, message.channel)
        await message.delete()
        print(f"`json\n{message_json}`")

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

@client.event
async def fetch_message_json(message_id, channel):
    try:
        fetched_message = await channel.fetch_message(message_id)

         # Get info as a dictionary 
        message_info = {
            attr: getattr(fetched_message, attr) 
            for attr in dir(fetched_message)
            if not attr.startswith('_') 
        }

        # Special Handling for 'author' 
        if 'author' in message_info:
            message_info['author'] = str(message_info['author'])  # Convert to basic string

        return message_info 

    except discord.NotFound:
        return "Error: Message not found."
    except discord.Forbidden:
        return "Error: Missing permissions to fetch the message."
    except discord.HTTPException as e:
        return f"Error: Failed to fetch message. Error code: {e.code}"

if TOKEN is not None:
  client.run(TOKEN)
else:
  print("No token provided.")
