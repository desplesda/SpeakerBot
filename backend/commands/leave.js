// @ts-check

// Leave the current voice channel, and close the voice connection.

const path = require('path')

const state = require('../state');

const requireJSON5 = require('require-json5');
const messages = requireJSON5(path.join(__dirname, '../messages.json'));


const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('leave')
		.setDescription('Leaves a voice channel'),

	/** @param {import('discord.js').CommandInteraction} interaction */
	async execute(interaction) {

		const currentState = state.getState();

		if (currentState.voiceConnection == null) {
			await interaction.reply({ content: messages.NotInChannel, ephemeral: true });
			return;
		}

		currentState.voiceConnection.destroy();
		currentState.audioPlayer?.stop();

		await interaction.reply({ content: messages.DisconnectionComplete, ephemeral: true });

		state.setState({ ...currentState, voiceConnection: null, audioPlayer: null, focusedUser: null, textChannel: null });

	},
};