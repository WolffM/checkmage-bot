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
  if message.content.startswith('!thursday'):
    channel_id = int(os.getenv('CHANNEL_ID', 0))  # Fetch from .env file with default value of 0
    channel = client.get_channel(channel_id)
    next_session_number = await create_weekly_calendar_message(channel, day_offset=3)  # Thursday offset
    
  elif message.content.startswith('!friday'): 
    channel_id = int(os.getenv('CHANNEL_ID', 0))
    channel = client.get_channel(channel_id)
    next_session_number = await create_weekly_calendar_message(channel, day_offset=4)  # Friday offset

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
    
    # Calculate timestamps for next Thursday
    if start_timestamp is None:
      now = datetime.datetime.now()
      target_day = now + datetime.timedelta(days=(day_offset - now.weekday()) % 7) 
      start_timestamp = int(target_day.replace(hour=18, minute=0, second=0).timestamp())  # 6 PM
      end_timestamp = int(target_day.replace(hour=21, minute=0, second=0).timestamp())   # 9 PM

    # Create the message content
    message = f"""
    Next Session: <t:{start_timestamp}:t> - <t:{end_timestamp}:t>
    which is <t:{start_timestamp}:R>!
    @everyone
    """

    # Send the message
    await channel.send(message)

if TOKEN is not None:
  client.run(TOKEN)
else:
  print("No token provided.")
