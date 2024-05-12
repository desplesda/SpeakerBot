//@ts-check

// When a message is created in a channel, speak it into the currently connected
// voice channel if it's from the right user and channel.

const { speak } = require('../text-to-speech');

const state = require('../state');

module.exports = {
	name: 'messageCreate',
	/** @param {import('discord.js').Message} message */
	async execute(message) {
		const currentState = state.getState();

		if (message.guildId !== state.getState().guildID) {
			// Ignore this message - it didn't come from the guild we care about
			return;
		}

		if (currentState.voiceConnection == null) {
			// We're not connected - don't try and play any audio
			console.error(`Can't send audio for message - no audio connection`)
			return;
		}

		// Only relay messages from our current channel
		if (message.channel.id != currentState.textChannel?.id) {
			return;
		}

		// Only relay messages from our focused user
		if (message.member?.id != currentState.focusedUser?.id) {
			return;
		}

		console.log(`[${(new Date).toISOString()}] ${currentState.focusedUser?.username}#${currentState.focusedUser?.discriminator}: "${message.content}"`);

		// Speak the text of this message!
		await speak(message.cleanContent);
	},
};