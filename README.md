# SpeakerBot

A text-to-speech bot for [Discord](https://discord.com).

This bot joins a voice channel, and speaks the content of all messages sent by a user.

## Context

I frequently play video games with friends, using Discord for voice chat. One of those friends has kids, and doesn't want to speak into the microphone during night-time gaming sessions for fear of waking the kids up, so they join the channel, mute their mic, and then type their messages into a text channel. This works, but it means that not every message might be seen by other users.

This bot is a work-around for this problem. Upon request, it can join a voice channel, and start monitoring for messages sent by the user who requested it. Any messages are converted to audio via [Azure Text to Speech](https://azure.microsoft.com/en-au/services/cognitive-services/text-to-speech/), and played into the channel. This lets other players hear the messages.

> **WARNING:** This bot is _not_ a full-featured solution. It's designed to join one channel at a time (that is, you need one instance per Discord server), it has no security features, and is only intended to be used in a server where everyone trusts each other. It also requires that you have a subscription to Azure. Azure Speech offers a free tier, but it will cost you money if you need more than their free tier allows.
>
> I don't offer any support for this bot, if you choose to use it yourself. Feel free to read and make use of its source code, as per the [license](LICENSE.md), but I can't help you set it up and use it yourself.

## Setup

This bot is configured using environment variables. If you have a `.env` file in the working directory, it will read the variables from there.

* `SPEAKER_KEY`: A key for use with Azure Speech. 
* `SPEAKER_REGION`: The region to use with Azure Speech.
* `VOICE_LANGUAGE`: The language that the bot should speak in.
* `VOICE_NAME`: The name of the Azure Speech Neural Voice to use.
* `DISCORD_BOT_TOKEN`: The Discord bot token to connect to Discord with.
* `DISCORD_CLIENT_ID`: The bot's client ID.
* `DISCORD_GUILD_ID`: The ID of the Discord server that the bot should be working with.

## Commands

The bot is controlled through these commands. In order for them to work, the command need to be installed on your Discord server, by running the following command:

```shell
node deploy-commands.js
```

### Join a channel

`/join <`**`channel`**`>`: The bot will join the specificed voice channel. The bot will begin speaking the messages from the user who requested it, in the channel that this command was used.

The bot can only be connected to a single channel at once. If the bot is already in a different voice channel, it will change to the new channel.

### Leave a channel

`/leave`: Instructs the bot to disconnect from the current voice channel.

### Change user

`/speakme`: Instructs the bot to start speaking the messages of the user who invokes this command (and stop speaking those of the previous user.)

### Show status

`/status`: The bot will indicate which user it's currently speaking the messages of, and from which channel.
