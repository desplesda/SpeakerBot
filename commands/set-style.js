const { SlashCommandBuilder } = require('@discordjs/builders');
const { voices, setState, getState } = require('../state');

const Options = {
	Style: 'style',
};

module.exports = {
	data: new SlashCommandBuilder()
		.setName('style')
		.setDescription('Sets the current voice style. (Use /list-styles to see available options.)')
		.addStringOption(option => {
			option.setName(Options.Style);
			option.setDescription('The voice style to use.');
			option.setRequired(true);
			return option;
		}),

	/** @param {import('discord.js').CommandInteraction} interaction */
	async execute(interaction) {
		const requestedStyle = interaction.options.getString(Options.Style, true);

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

		const selectedStyle = availableStyles.filter(s => s.toLowerCase() == requestedStyle.toLowerCase())[0];
		if (!selectedStyle) {
			await interaction.reply({ content: `\`${requestedStyle}\` is not a valid style for voice ${currentVoice.localName}. Available styles are: ${availableStyles.join(', ')}.`, ephemeral: true });
			return;
		}

		setState({ ...getState(), voiceStyle: selectedStyle });

		interaction.reply({ content: `Voice style is now ${selectedStyle}`, ephemeral: true });
	},
};