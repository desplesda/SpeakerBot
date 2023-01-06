// @ts-check

// When a slash command is run, dispatch it to the correct command handler (see
// the ./commands directory)

const state = require('../state');

module.exports = {
	name: 'interactionCreate',

	/**
	 * @param {import('discord.js').CommandInteraction} interaction
	 */
	async execute(interaction) {
		if (!interaction.isCommand()) return;

		const currentState = state.getState();

		if (interaction.guildId !== currentState.guildID) {
			// Ignore this interaction - it didn't come from the guild we care about
			return;
		}

		console.log(`[${(new Date).toISOString()}] Command: ${interaction.commandName}; user: ${interaction.user.username}#${interaction.user.discriminator}; options: ${JSON.stringify(interaction.options)}`);

		// @ts-expect-error
		const command = currentState.client.commands.get(interaction.commandName);

		if (!command) return;

		try {
			await command.execute(interaction);
		}
		catch (error) {
			console.error(error);
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	},
};