// @ts-check

// Performs text-to-speech, and plays it out through the current voice
// connection.

const { createAudioResource } = require('@discordjs/voice');
const sdk = require('microsoft-cognitiveservices-speech-sdk');
const { PassThrough } = require('stream');
const state = require('./state');

/**
 *
 * @param {string} text The text to generate speech from.
 * @param {(buffer: PassThrough) => void} onComplete A callback that receives a buffer with the generated speech.
 * @param {(*)} onError A callback that runs on error.
 */
function synthesizeSpeech(text, onComplete, onError) {
	const speechConfig = sdk.SpeechConfig.fromSubscription(
		process.env['SPEAKER_KEY'],
		process.env['SPEAKER_REGION'],
	);

	speechConfig.speechSynthesisLanguage = process.env['VOICE_LANGUAGE'];
	speechConfig.speechSynthesisVoiceName = process.env['VOICE_NAME'];

	speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Ogg24Khz16BitMonoOpus;

	// const audioConfig = sdk.AudioConfig.fromAudioFileOutput('output.wav');

	const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

	// synthesizer.speakSsmlAsync(
	// 	`<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
	// 	xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${process.env['VOICE_LANGUAGE']}">
	//  <voice name="${process.env['VOICE_NAME']}">
	// 	 <mstts:express-as style="lyrical">
	// 		 ${text}
	// 	 </mstts:express-as>
	//  </voice>
	// 	</speak>`, result => {
	// 		synthesizer.close();
	// 		if (result) {
	// 			const { audioData } = result;

	// 			synthesizer.close();

	// 			// convert arrayBuffer to stream
	// 			const bufferStream = new PassThrough();
	// 			bufferStream.end(Buffer.from(audioData));
	// 			onComplete(bufferStream);
	// 		}
	// 	},
	// 	error => {
	// 		console.log(error);
	// 		synthesizer.close();
	// 		onError(error);
	// 	});


	synthesizer.speakTextAsync(
		text,
		result => {
			synthesizer.close();
			if (result) {
				const { audioData } = result;

				synthesizer.close();

				// convert arrayBuffer to stream
				const bufferStream = new PassThrough();
				bufferStream.end(Buffer.from(audioData));
				onComplete(bufferStream);
			}
		},
		error => {
			console.log(`[${(new Date).toISOString()}] TTS error: ${error}`);
			synthesizer.close();
			onError(error);
		});
}


module.exports = {

	speak: async (text) => {

		const currentState = state.getState();

		// First, check to see if we can play audio.

		if (currentState.player == null) {
			// We can't do anything - we have no player to use. We also have no
			// Discord interaction to use to send a message on, so the best we
			// can do here is to log to the console...
			console.warn('Tried to play speech, but current state has no player');
			return;
		}

		// Use the text to get audio.

		/** @type PassThrough */
		const speech = await new Promise((resolve) => {
			synthesizeSpeech(text, (result) => {
				resolve(result);
			});
		});

		// Create an audio resource from the returned stream.
		const audioResource = createAudioResource(speech);

		// Play the stream into the voice channel connection.
		currentState.player.play(audioResource);
	},

};