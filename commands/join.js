// @ts-check

// Join a specified voice channel, and start speaking the messages of the person
// who ran the command.

const { joinVoiceChannel, createAudioPlayer, VoiceConnectionStatus, entersState } = require('@discordjs/voice');

const { SlashCommandBuilder } = require('@discordjs/builders');

const state = require('../state');

const requireJSON5 = require('require-json5');
const { Constants } = require('discord.js');

const messages = requireJSON5('./messages.json');

const Options = {
	Channel: 'channel',
};

module.exports = {
	data: new SlashCommandBuilder()
		.setName('join')
		.setDescription('Joins a voice channel')
		.addChannelOption(option => {
			option.setName(Options.Channel);
			option.setDescription('Select a channel to join');
			option.setRequired(true);

			// Type error: TypeScript gets confused about the type of these
			// enums here, due to Discord.js Historical Reasons. It's actually
			// fine.

			// @ts-expect-error
			option.addChannelTypes([Constants.ChannelTypes.GUILD_VOICE, Constants.ChannelTypes.GUILD_STAGE_VOICE]);
			return option;
		}),

	/** @param {import('discord.js').CommandInteraction} interaction */
	async execute(interaction) {


		/** @type {import('@discordjs/voice').DiscordGatewayAdapterCreator} */
		// @ts-expect-error
		const adapter = interaction.guild.voiceAdapterCreator;

		// Join the indicated voice channel and get a connection
		const connection = joinVoiceChannel({
			channelId: interaction.options.getChannel(Options.Channel).id,
			guildId: interaction.guildId,
			adapterCreator: adapter,
		});

		// Create the audio player for this connection
		const player = createAudioPlayer();

		// Subscribe the connection to the audio player (will play audio on the voice connection)
		const subscription = connection.subscribe(player);

		// subscription could be undefined if the connection is destroyed!
		if (!subscription) {
			// Unsubscribe after 5 seconds (stop playing audio on the voice connection)
			await interaction.reply({ content: messages.FailedToSubscribe, ephemeral: true });
			setTimeout(() => subscription.unsubscribe(), 5_000);
			return;
		}

		connection.on(VoiceConnectionStatus.Disconnected, async () => {
			try {
				await Promise.race([
					entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
					entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
				]);
				// Seems to be reconnecting to a new channel - ignore disconnect
			}
			catch (error) {
				// Seems to be a real disconnect which SHOULDN'T be recovered from
				console.error('Lost my connection!');
				connection.destroy();
				subscription.unsubscribe();
				state.setState({ ...state.getState(), connection: null, player: null, focus: null });

			}
		});

		const focus = interaction.user;

		const currentState = state.getState();

		const textChannel = interaction.channel;

		state.setState({ ...currentState, player, connection, focus, textChannel });

		await interaction.reply({ content: messages.ConnectionComplete, ephemeral: true });
	},
};