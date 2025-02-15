// @ts-check

// When a message is created in a channel, speak it into the currently connected
// voice channel if it's from the right user and channel.

const { speak } = require('../text-to-speech');

const state = require('../state');
const { error, log } = require('../util');

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
			error('Can\'t send audio for message - no audio connection');
			return;
		}

		if (!message.author) {
			// The message doesn't have a valid user
			return;
		}

		const isFromOverrideUser = currentState.overrideAllowUsers.includes(message.author.id);
		const isFromFocusedUser = message.author.id == currentState.focusedUser?.id;
		const isFromValidUser = isFromFocusedUser || isFromOverrideUser;

		// Only relay messages from our focused user
		if (!isFromValidUser) {
			return;
		}

		// Only relay messages from our current channel
		if (!isFromOverrideUser && message.channel.id != currentState.textChannel?.id) {
			return;
		}

		log(`${message.author.username}: "${message.content}"`);

		// Speak the text of this message!
		speak(message.cleanContent, { rate: isFromOverrideUser ? 1.5 : 1 });
	},
};