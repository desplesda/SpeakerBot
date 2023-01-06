// @ts-check

// Contains methods for accessing, and making changes to, the global state of the application.

// The state is designed around the State object, which contains references to
// the necessary Discord objects that control what we're doing.

/**
 * @typedef {Object} State The global state of the application.
 * @property {import('discord.js').Client | null} client The Discord client.
 * @property {import('@discordjs/voice').VoiceConnection | null} connection The
 * current voice connection.
 * @property {import('@discordjs/voice').AudioPlayer | null} player The current
 * audio player.
 * @property {import('discord.js').User | null} focus The user we are speaking
 * messages from.
 * @property {import('discord.js').TextBasedChannel | null} textChannel The text channel we should speak messages from, if they come from the focused user.
 * @property {string} voiceName The name of the Azure Speech voice we are using. This must be a valid voice for the language specified by voiceLanguage.
 * @property {string} voiceLanguage The language we are speaking in.
 * @property {string} guildID The guild ID this process is listening for.
 */

/** @type {State} */
let state = {
	client: null,
	connection: null,
	player: null,
	focus: null,
	textChannel: null,
	voiceName: 'en-AU-WilliamNeural',
	voiceLanguage: 'en-AU',
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

/** @returns {State} */
const getState = () => state;

/** @param {State} nextState */
const setState = nextState => {
	state = nextState;
};

module.exports = {
	getState, setState,
};