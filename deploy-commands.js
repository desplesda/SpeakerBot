// @ts-check

// Deploys all commands found in the ./commands folder to the guild indicated in
// the .env file.
//
// Usage: node deploy-commands.js

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

require('dotenv').config();

const clientId = process.env['DISCORD_CLIENT_ID'];
const guildId = process.env['DISCORD_GUILD_ID'];
const token = process.env['DISCORD_BOT_TOKEN'];

const fs = require('fs');

// Find every .js file in the ./commands folder.
const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

// For each command we found, push its 'data' property into the commands list.
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	commands.push(command.data.toJSON());
}

// Finally, register the commands we've gathered.
const rest = new REST({ version: '9' }).setToken(token);

rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);
