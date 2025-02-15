/**
 * @returns {object}
 */
function missingValue() {
	throw new Error('missing value');
}

function log(/** @type{string} */item, /** @type{unknown[]}*/ ...items) {
	console.log(`[${(new Date).toISOString()}] ${item}`, ...items);
}
function warn(/** @type{string} */item, /** @type{unknown[]}*/ ...items) {
	console.warn(`[${(new Date).toISOString()}] ${item}`, ...items);
}
function error(/** @type{string} */item, /** @type{unknown[]}*/ ...items) {
	console.error(`[${(new Date).toISOString()}] ${item}`, ...items);
}

module.exports = { missingValue, log, warn, error };