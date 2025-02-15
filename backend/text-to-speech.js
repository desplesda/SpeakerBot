// @ts-check

// Performs text-to-speech, and plays it out through the current voice
// connection.

const { createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const { PassThrough } = require('stream');
const { missingValue, log, error, warn } = require('./util');

/**
 *
 * @param {string} text The text to generate speech from.
 * @param {SpeechOptions | undefined} options Additional options for controlling speech.
 * @param {(buffer: PassThrough) => void} onComplete A callback that receives a buffer with the generated speech.
 * @param {(*)} onError A callback that runs on error.
 */
function synthesizeSpeech(text, options, onComplete, onError) {
	const synthesizer = getSynthesizer();

	const state = require('./state');

	const encodedText = text.replace(/[\u00A0-\u9999<>&]/g, i => '&#' + i.charCodeAt(0) + ';');
	const ssmlToSpeak = `
	<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
		<voice name="${state.getState().voiceName}">
			<mstts:express-as style="${state.getState().voiceStyle}" styledegree="1">
				<prosody rate="${options?.rate ?? 1}">
					${encodedText}
				</prosody>
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
					error(`TTS error: ${result.errorDetails}`);
					synthesizer.close();
					onError(result.errorDetails);
					return;
				}

				log(`Received ${audioDuration / 10000000}s of audio`);

				synthesizer.close();

				// convert arrayBuffer to stream
				const bufferStream = new PassThrough();
				bufferStream.end(Buffer.from(audioData));
				onComplete(bufferStream);
			}
		},
		err => {
			error(`TTS error: ${err}`);
			synthesizer.close();
			onError(err);
		});
}

/** @typedef {{text:string, audioResource: import("@discordjs/voice").AudioResource | null}} TTSJob */

/** @type{TTSJob[]} */
const jobQueue = [];

const MAX_JOB_QUEUE_SIZE = 4

const addJob = (/** @type{TTSJob} */ job) => {
	// Add the job to the queue
	jobQueue.push(job);

	// Drop items from the queue if we've got too many
	while (jobQueue.length > MAX_JOB_QUEUE_SIZE) {
		jobQueue.shift();
	}
};

const removeJob = (/** @type{TTSJob} */ job) => {
	const index = jobQueue.indexOf(job);
	if (index > -1) {
		jobQueue.splice(index, 1);
	}
	return jobQueue;
};

const clearJobQueue = () => {
	jobQueue.splice(0, jobQueue.length);
}

// Attempts to play the next piece of audio in the job queue, if the job has
// available audio.
const tickJobQueue = (/** @type{import("@discordjs/voice").AudioPlayer} */ player) => {
	if (jobQueue.length == 0) {
		// Nothing to do.
		return;
	}

	const nextAudio = jobQueue[0].audioResource;

	if (nextAudio === null) {
		// We have a job, but its audio hasn't arrived yet.
		return;
	}

	if (player.state.status !== AudioPlayerStatus.Idle) {
		// We have audio, but the player is not currently idle; we can't process
		// the next job.
		return;
	}

	// Remove the job from the queue and begin playing it.
	jobQueue.shift();
	player.play(nextAudio);
};

// Sets up the audio player to tick the job queue whenever the player finishes
// playing, moving on to the next  available item in the job queue.
const registerAudioPlayerIdleHook = (
	/** @type{import("@discordjs/voice").AudioPlayer} */ player,
) => {

	player.on('stateChange', (oldState, newState) => {
		if (oldState.status === AudioPlayerStatus.Playing && newState.status === AudioPlayerStatus.Idle) {
			// We went from playing to idle. We might have audio to play.
			tickJobQueue(player);
		}
	});
};


/** @typedef {{rate: number}} SpeechOptions */

module.exports = {

	speak: (/** @type {string} */ text, /** @type {SpeechOptions | undefined} */ options) => {

		const state = require('./state');

		const currentState = state.getState();

		// First, check to see if we can play audio.

		if (currentState.audioPlayer == null) {
			// We can't do anything - we have no player to use. We also have no
			// Discord interaction to use to send a message on, so the best we
			// can do here is to log to the console...
			warn('Tried to play speech, but current state has no player');
			return;
		}

		const player = currentState.audioPlayer;

		// Use the text to get audio.

		/** @type{TTSJob} */
		const job = { text, audioResource: null };

		addJob(job);

		/** @type PassThrough */
		synthesizeSpeech(
			text,
			options,
			(speech) => {
				// Create an audio resource from the returned stream.
				const audioResource = createAudioResource(speech);

				// Update the job with the newly created audio.
				job.audioResource = audioResource;

				// Play the newly retrieved audio, if nothing is currently
				// playing.
				tickJobQueue(player);

			},
			(err) => {
				error(`Error synthesizing speech: ${err}`);
				// Remove this job from the queue
				removeJob(job);
			},
		);
	},

	listVoices: async () => {
		const synthesizer = getSynthesizer();

		const result = await synthesizer.getVoicesAsync();

		return result.voices;
	},

	/** @type {(voiceName: string) => Promise<string[] | undefined>} */
	listStyles: async (voiceName) => {
		const voice = (await this.listVoices()).filter(v => v.localName == voiceName)[0];
		return voice.styleList;
	},

	registerAudioPlayerIdleHook,

	clearJobQueue,

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
