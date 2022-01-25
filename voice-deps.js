// Prints a package dependency report, indicating whether or not Discord.js
// Voice has all the packages it needs to work.
//
// Usage: node voice-deps.js

const { generateDependencyReport } = require('@discordjs/voice');

console.log(generateDependencyReport());

