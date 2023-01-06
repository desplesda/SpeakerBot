const { SlashCommandBuilder } = require('@discordjs/builders');
const { voices } = require('../state');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('list-voices')
		.setDescription('Lists available voices.'),

	/** @param {import('discord.js').CommandInteraction} interaction */
	async execute(interaction) {
		const voiceNames = voices.map(v => `${v.localName} (${v.locale})`);

		interaction.reply({ content: `Available voices:\n${voiceNames.join('\n')}`, ephemeral: true });
	},
};