// Report a message to the console when we log in.

module.exports = {
	name: 'ready',
	once: true,
	execute(client) {
		console.log(`[${(new Date).toISOString()}] Ready! Logged in as ${client.user.tag}`);
	},
};