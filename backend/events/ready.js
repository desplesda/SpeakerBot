// Report a message to the console when we log in.

const { log } = require('../util');

module.exports = {
	name: 'ready',
	once: true,
	execute(client) {
		log(`Ready! Logged in as ${client.user.tag}`);
	},
};