const { Client, Collection, Intents } = require('discord.js');

const fs = require('fs');
const state = require('./state');
const path = require('path');

const { Server } = require('socket.io');
const { useAzureSocketIO } = require('@azure/web-pubsub-socket.io');

const { missingValue } = require('./util');
const { speak } = require('./text-to-speech');

const { log, error } = require('./util');

require('dotenv').config({ path: path.resolve(process.cwd(), '..', '.env') });

/** @typedef {import("../frontend/src/schemas").ServerState ServerState} */

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

	const MY_ROOM = process.env['DISCORD_GUILD_ID'] || missingValue();

	const io = new Server(3000);
	await useAzureSocketIO(io, {
		hub: 'Hub', // The hub name can be any valid string.
		connectionString: process.env['PUBSUB_CONNECTION_STRING'] || missingValue(),
	});

	state.addStateChangeListener(() => {
		sendStateToAllClientsInRoom();
	});

	const sendStateToClient = (socket) => {
		socket.emit('server-state', getStateForClient());
	};

	const sendStateToAllClientsInRoom = () => {
		io.to(MY_ROOM).emit('server-state', getStateForClient());
	};

	/** @returns {ServerState} */
	const getStateForClient = () => {
		const newState = state.getState();
		/** @type {ServerState} */
		const currentState = {
			connectionState: (newState.textChannel) ? {
				state: 'connected',
				channel: newState.textChannel.name,
				user: newState.focusedUser?.username ?? 'unknown',
				voice: newState.voiceName,
			} : {
				state: 'not-connected',
			},
			messages: state.getState().messages,
		};
		return currentState;

	};

	io.on('connection', async (socket) => {
		// Sends a message to the client

		socket.on('join-room', async (room) => {
			if (room !== MY_ROOM) {
				log('Ignoring client for not my room');
				return;
			}

			log(`Joining client ${socket.id} to room ${MY_ROOM}`);
			await socket.join(room);
			sendStateToClient(socket);
		});

		socket.on('set-messages', async (/** @type {import("../frontend/src/schemas").ServerState}*/arg) => {

			if (!socket.rooms.has(MY_ROOM)) {
				// This socket isn't in my room; ignore.
				return;
			}

			state.setState({ ...state.getState(), messages: arg.messages });

			state.saveState();

			sendStateToAllClientsInRoom();
		});

		// Receives a message from the client
		socket.on('send-message', async (arg) => {

			if (!socket.rooms.has(MY_ROOM)) {
				// This socket isn't in my room; ignore.
				return;
			}

			log('send-message: ', arg);

			const currentState = state.getState();

			if (currentState.textChannel) {
				currentState.textChannel.send(arg);
			}
			if (currentState.voiceConnection) {
				speak(arg);
			}
		});
	});
}


start();