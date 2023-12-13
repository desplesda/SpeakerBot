const { SlashCommandBuilder } = require('@discordjs/builders');
const { voices, getState } = require('../state');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('list-styles')
		.setDescription('Lists available styles for the current voice.'),

	/** @param {import('discord.js').CommandInteraction} interaction */
	async execute(interaction) {
		const currentVoice = voices.filter(v => v.shortName == getState().voiceName)[0];
		if (!currentVoice) {
			interaction.reply({ content: `Error: the current voice (${getState().voiceName}) is not valid. Please set a new voice using \`/set-voice\`.`, ephemeral: true });
			return;
		}

		if (currentVoice.styleList.length == 0) {
			interaction.reply({ content: `The voice ${currentVoice.localName} does not support voice styles.`, ephemeral: true });
			return;
		}

		const availableStyles = ['neutral', ...currentVoice.styleList];

		interaction.reply({ content: `Available styles:\n${availableStyles.join(', ')}. Use \`/style\` to set a voice style. Current style is ${getState().voiceStyle}.`, ephemeral: true });
	},
};