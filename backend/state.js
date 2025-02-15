// @ts-check

const { listVoices } = require('./text-to-speech');

const fs = require('fs');
const path = require('path');

// Contains methods for accessing, and making changes to, the global state of the application.

/** @type {import('microsoft-cognitiveservices-speech-sdk').VoiceInfo[]} */
const voices = [];

async function loadVoices() {
	const allVoices = await listVoices();
	for (const voice of allVoices) {
		if (voice.locale.startsWith('en-') == false) {
			continue;
		}

		voices.push(voice);
	}
}

// The state is designed around the State object, which contains references to
// the necessary Discord objects that control what we're doing.

/**
 * @typedef {Object} State The global state of the application.
 * @property {import('discord.js').Client | null} client The Discord client.
 * @property {import('@discordjs/voice').VoiceConnection | null} voiceConnection The
 * current voice connection.
 * @property {import('@discordjs/voice').AudioPlayer | null} audioPlayer The current
 * audio player.
 * @property {import('discord.js').User | null} focusedUser The user we are speaking
 * messages from.
 * @property {import('discord.js').TextBasedChannel | null} textChannel The text
 * channel we should speak messages from, if they come from the focused user.
 * @property {string} voiceName The name of the Azure Speech voice we are using.
 * This must be a valid voice for the language specified by voiceLanguage.
 * @property {string} voiceLanguage The language we are speaking in.
 * @property {string} voiceStyle The style of the voice to use. If the specified
 * style is not applicable, it is ignored and a neutral style is used.
 * @property {string} guildID The guild ID this process is listening for.
 * @property {string[]} overrideAllowUsers A list of user IDs that will be listened for events, in addition to {@link focusedUser}.
 * @property {Zod.infer<typeof import('../frontend/src/schemas').AvailableMessages>} messages
 */

/** @type {State} */
let state = {
	client: null,
	voiceConnection: null,
	audioPlayer: null,
	focusedUser: null,
	textChannel: null,
	voiceName: 'en-AU-WilliamNeural',
	voiceLanguage: 'en-AU',
	voiceStyle: 'neutral',
	overrideAllowUsers: [],
	messages: { groups: [] },
	get guildID() {

		const guildID = process.env['DISCORD_GUILD_ID'];
		if (guildID) {
			return guildID;
		}
		else {
			throw new Error('Discord Guild ID is not set');
		}
	},
};

const statePath = path.resolve(__dirname, '..', 'state.json');

const saveState = () => {
	const stateJSON = JSON.stringify({
		voiceName: state.voiceName,
		voiceLanguage: state.voiceLanguage,
		voiceStyle: state.voiceStyle,
		messages: state.messages,
	});
	fs.writeFileSync(statePath, stateJSON);
};

const tryLoadState = () => {
	try {
		const stateJSON = JSON.parse(fs.readFileSync(statePath).toString());
		state = { ...state, ...stateJSON };
	}
	catch (err) {
		console.warn(`Failed to load state from ${statePath}`);
	}
};

/** @typedef {(state: State)=>void} StateChangeListener */

/** @type {StateChangeListener[]} */
let changeListeners = [];

/** @returns {State} */
const getState = () => state;

/** @param {State} nextState */
const setState = nextState => {
	state = nextState;
	for (const listener of changeListeners) {
		listener(nextState);
	}
};

const addStateChangeListener = (/** @type{StateChangeListener}*/ listener) => {
	changeListeners.push(listener);
};

const removeStateChangeListener = (/** @type{StateChangeListener} */ listener) => {
	changeListeners = changeListeners.filter(l => l !== listener);
};

module.exports = {
	getState, setState, saveState, tryLoadState, voices, loadVoices, addStateChangeListener, removeStateChangeListener,
};