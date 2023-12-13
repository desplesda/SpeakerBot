const { SlashCommandBuilder } = require('@discordjs/builders');
const { voices, setState, getState } = require('../state');

const Options = {
	Voice: 'voice',
};

module.exports = {
	data: new SlashCommandBuilder()
		.setName('voice')
		.setDescription('Sets the current voice. (Use /list-voices to see available options.)')
		.addStringOption(option => {
			option.setName(Options.Voice);
			option.setDescription('The voice to use.');
			option.setRequired(true);
			return option;
		}),

	/** @param {import('discord.js').CommandInteraction} interaction */
	async execute(interaction) {
		const voiceName = interaction.options.getString(Options.Voice, true);
		const voice = voices.find(v => v.localName.toLowerCase() == voiceName.toLowerCase());

		if (!voice) {
			await interaction.reply({ content: `\`${voiceName}\` is not a known voice`, ephemeral: true });
			return;
		}

		const displayName = `${voice.localName} (${voice.locale})`;

		setState({ ...getState(), voiceName: voice.shortName, voiceLanguage: voice.locale, voiceStyle: 'neutral' });

		interaction.reply({ content: `Speaking voice is now ${displayName}`, ephemeral: true });
	},
};