const { Client, Collection, Intents } = require('discord.js');

const fs = require('fs');
const state = require('./state');
const path = require('path');

const { log, error } = require('./util');

require('dotenv').config({ path: path.resolve(process.cwd(), '..', '.env') });

async function start() {
	// Fetch list of all voices
	await state.loadVoices();

	for (const voice of state.voices) {
		/** @type {import('microsoft-cognitiveservices-speech-sdk').VoiceInfo} */
		log(`Registered voice: ${voice.shortName}`);
	}

	// Create a new client instance
	const client = new Client({
		intents: [
			Intents.FLAGS.GUILDS,
			Intents.FLAGS.GUILD_VOICE_STATES,
			Intents.FLAGS.GUILD_MESSAGES,
		],
	});

	client.commands = new Collection();
	const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

	for (const file of commandFiles) {
		const command = require(`./commands/${file}`);
		// Set a new item in the Collection
		// With the key as the command name and the value as the exported module
		client.commands.set(command.data.name, command);
	}

	const eventFiles = fs.readdirSync(path.join(__dirname, 'events')).filter(file => file.endsWith('.js'));

	for (const file of eventFiles) {
		const event = require(`./events/${file}`);
		if (event.once) {
			client.once(event.name, (...args) => event.execute(...args));
		}
		else {
			client.on(event.name, (...args) => event.execute(...args));
		}
	}

	process.on('unhandledRejection', err => {
		error('Unhandled promise rejection:', err);
	});

	state.setState({ ...state.getState(), client: client, voiceConnection: null, audioPlayer: null });

	state.tryLoadState();

	client.login(process.env['DISCORD_BOT_TOKEN']);

}

start();