// @ts-check

// Reports on the current state of the bot.

const { SlashCommandBuilder } = require('@discordjs/builders');
const state = require('../state');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('status')
		.setDescription('Shows status information.'),
	async execute(interaction) {

		const currentState = state.getState();

		if (currentState.connection) {

			if (!currentState.focus || !currentState.textChannel) {
				await interaction.reply({ content: 'I\'m not currently speaking anyone\'s messages.', ephemeral: true });
			}
			else {
				const focusUser = `<@${currentState.focus.id}>`;

				const textChannel = `<#${currentState.textChannel.id}>`;

				await interaction.reply({ content: `I'm currently speaking ${focusUser}'s messages in ${textChannel}, using voice \`${currentState.voiceName}\` and style \`${currentState.voiceStyle}\`.`, ephemeral: true });

			}
		}
		else {
			await interaction.reply({ content: 'I\'m not currently in a channel.', ephemeral: true });
		}

	},
};