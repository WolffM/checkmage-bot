import discord
import os
import datetime

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
      target_day = now + datetime.timedelta(days=(day_offset - now.weekday()) % 7) 
      start_timestamp = int(target_day.replace(hour=18, minute=0, second=0).timestamp())  # 6 PM
      end_timestamp = int(target_day.replace(hour=21, minute=0, second=0).timestamp())   # 9 PM

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
