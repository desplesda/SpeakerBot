// @ts-check

// Join a specified voice channel, and start speaking the messages of the person
// who ran the command.

const path = require('path');

const { joinVoiceChannel, createAudioPlayer, VoiceConnectionStatus, entersState } = require('@discordjs/voice');

const { SlashCommandBuilder } = require('@discordjs/builders');

const state = require('../state');

const requireJSON5 = require('require-json5');
const { Constants } = require('discord.js');
const { registerAudioPlayerIdleHook } = require('../text-to-speech');
const { log, error } = require('../util');

const messages = requireJSON5(path.join(__dirname, '../messages.json'));

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

			option.addChannelTypes([Constants.ChannelTypes.GUILD_VOICE, Constants.ChannelTypes.GUILD_STAGE_VOICE]);
			return option;
		}),

	/** @param {import('discord.js').CommandInteraction} interaction */
	async execute(interaction) {


		/** @type {import('@discordjs/voice').DiscordGatewayAdapterCreator} */
		// @ts-expect-error
		const adapter = interaction.guild.voiceAdapterCreator;

		const voiceChannel = interaction.options.getChannel(Options.Channel);
		const guildId = interaction.guildId;

		if (!voiceChannel) {
			interaction.reply('That\'s not a valid channel!');
			return;
		}

		if (!guildId) {
			interaction.reply('You need to send this command from inside a server!');
			return;
		}

		// Join the indicated voice channel and get a connection
		const connection = joinVoiceChannel({
			channelId: voiceChannel.id,
			guildId: guildId,
			adapterCreator: adapter,
		});

		// Create the audio player for this connection
		const player = createAudioPlayer();

		// Set up the player to automatically play enqueued audio if it ever goes idle
		registerAudioPlayerIdleHook(player);

		// Subscribe the connection to the audio player (will play audio on the voice connection)
		const subscription = connection.subscribe(player);

		// subscription could be undefined if the connection is destroyed!
		if (!subscription) {
			// Unsubscribe after 5 seconds (stop playing audio on the voice connection)
			await interaction.reply({ content: messages.FailedToSubscribe, ephemeral: true });
			// setTimeout(() => subscription.unsubscribe(), 5_000);
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
			catch (err) {
				// Seems to be a real disconnect which SHOULDN'T be recovered from
				error('Lost my connection!');
				connection.destroy();
				subscription.unsubscribe();
				state.setState({ ...state.getState(), voiceConnection: null, audioPlayer: null, focusedUser: null });

			}
		});

		const focus = interaction.user;

		const currentState = state.getState();

		const textChannel = interaction.channel;

		log(`Connected to audio channel: ${connection.joinConfig.channelId}`);

		state.setState({ ...currentState, audioPlayer: player, voiceConnection: connection, focusedUser: focus, textChannel });

		const controlPanelURL = `${process.env['CONTROL_PANEL_URL']}?r=${guildId}`;

		await interaction.reply({ content: messages.ConnectionComplete.replace('%CONTROL_PANEL_URL%', controlPanelURL), ephemeral: true });
	},
};