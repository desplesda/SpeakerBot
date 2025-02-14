/**
 * @returns {object}
 */
function missingValue() {
	throw new Error('missing value');
}

module.exports = { missingValue };