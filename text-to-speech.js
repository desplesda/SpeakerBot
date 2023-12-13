// @ts-check

// Performs text-to-speech, and plays it out through the current voice
// connection.

const { createAudioResource } = require('@discordjs/voice');
const { PassThrough } = require('stream');

/**
 * @returns {object}
 */
function missingValue() {
	throw new Error('missing value');
}

/**
 *
 * @param {string} text The text to generate speech from.
 * @param {(buffer: PassThrough) => void} onComplete A callback that receives a buffer with the generated speech.
 * @param {(*)} onError A callback that runs on error.
 */
function synthesizeSpeech(text, onComplete, onError) {
	const synthesizer = getSynthesizer();

	const state = require('./state');

	const ssmlToSpeak = `
	<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
		<voice name="${state.getState().voiceName}">
			<mstts:express-as style="${state.getState().voiceStyle}" styledegree="1">
				${text}
			</mstts:express-as>
		</voice>
	</speak>
	`;

	synthesizer.speakSsmlAsync(
		ssmlToSpeak,
		result => {
			synthesizer.close();
			if (result) {
				const { audioData, audioDuration } = result;

				if (!audioData) {
					console.error(`[${(new Date).toISOString()}] TTS error: ${result.errorDetails}`);
					synthesizer.close();
					onError(result.errorDetails);
				}

				console.log(`[${(new Date).toISOString()}] Received ${audioDuration / 10000000}s of audio`);

				synthesizer.close();

				// convert arrayBuffer to stream
				const bufferStream = new PassThrough();
				bufferStream.end(Buffer.from(audioData));
				onComplete(bufferStream);
			}
		},
		error => {
			console.error(`[${(new Date).toISOString()}] TTS error: ${error}`);
			synthesizer.close();
			onError(error);
		});
}


module.exports = {

	speak: async (text) => {

		const state = require('./state');

		const currentState = state.getState();

		// First, check to see if we can play audio.

		if (currentState.audioPlayer == null) {
			// We can't do anything - we have no player to use. We also have no
			// Discord interaction to use to send a message on, so the best we
			// can do here is to log to the console...
			console.warn('Tried to play speech, but current state has no player');
			return;
		}

		// Use the text to get audio.

		/** @type PassThrough */
		const speech = await new Promise((resolve) => {
			synthesizeSpeech(
				text,
				(result) => {
					resolve(result);
				},
				(error) => {
					console.error(`Error synthesizing speech: ${error}`);
				},
			);
		});

		// Create an audio resource from the returned stream.
		const audioResource = createAudioResource(speech);

		// Play the stream into the voice channel connection.
		currentState.audioPlayer.play(audioResource);
	},

	listVoices: async () => {
		const synthesizer = getSynthesizer();

		const result = await synthesizer.getVoicesAsync();

		return result.voices;
	},

	/** @type {(string) => Promise<string[] | undefined>} */
	listStyles: async (voiceName) => {
		const voice = (await this.listVoices()).filter(v => v.localName == voiceName)[0];
		return voice.styleList;
	},

};


function getSynthesizer() {

	const state = require('./state');
	const sdk = require('microsoft-cognitiveservices-speech-sdk');

	const speechConfig = sdk.SpeechConfig.fromSubscription(
		process.env['SPEAKER_KEY'] || missingValue(),
		process.env['SPEAKER_REGION'] || missingValue(),
	);

	speechConfig.speechSynthesisLanguage = state.getState().voiceLanguage;
	speechConfig.speechSynthesisVoiceName = state.getState().voiceName;

	speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Ogg24Khz16BitMonoOpus;

	// const audioConfig = sdk.AudioConfig.fromAudioFileOutput('output.wav');
	const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

	return synthesizer;
}
