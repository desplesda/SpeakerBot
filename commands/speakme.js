// @ts-check

// Instructs the bot to start speaking the messages from the user who issued the
// command.

const { SlashCommandBuilder } = require('@discordjs/builders');

const state = require('../state');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('speakme')
		.setDescription('Makes the bot speak your messages.'),

	/**
	 *
	 * @param {import('discord.js').CommandInteraction} interaction
	 */
	async execute(interaction) {

		const currentState = state.getState();

		const focusedUser = interaction.user;

		const textChannel = interaction.channel;

		state.setState({ ...currentState, focusedUser, textChannel });

		if (currentState.voiceConnection) {
			await interaction.reply({ content: `I'm now speaking <@${interaction.user.id}>'s messages.`, ephemeral: false });
		}
		else {
			await interaction.reply({ content: 'I\'m not in a voice channel. If you use `/join`, I\'ll join that channel and start speaking your messages.', ephemeral: true });
		}

	},
};