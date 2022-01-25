// When a slash command is run, dispatch it to the correct command handler (see
// the ./commands directory)

const state = require('../state');

module.exports = {
	name: 'interactionCreate',
	async execute(interaction) {
		if (!interaction.isCommand()) return;

		const currentState = state.getState();

		const command = currentState.client.commands.get(interaction.commandName);

		if (!command) return;

		try {
			await command.execute(interaction);
		}
		catch (error) {
			console.error(error);
			await interaction.reply({ content: interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true }), ephemeral: true });
		}
	},
};