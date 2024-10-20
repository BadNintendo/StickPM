/*  ██╗██╗                                                                                           ██╗██╗
 *  ██║╚═╝  ███████╗████████╗██╗ ██████╗██╗  ██╗██████╗ ███╗   ███╗     ██████╗ ██████╗ ███╗   ███╗  ╚═╝██║
 *  ██║     ██╔════╝╚══██╔══╝██║██╔════╝██║ ██╔╝██╔══██╗████╗ ████║    ██╔════╝██╔═══██╗████╗ ████║     ██║
 *  ██║     ███████╗   ██║   ██║██║     █████╔╝ ██████╔╝██╔████╔██║    ██║     ██║   ██║██╔████╔██║     ██║
 *  ██║     ╚════██║   ██║   ██║██║     ██╔═██╗ ██╔═══╝ ██║╚██╔╝██║    ██║     ██║   ██║██║╚██╔╝██║     ██║
 *  ██║     ███████║   ██║   ██║╚██████╗██║  ██╗██║     ██║ ╚═╝ ██║ ██╗╚██████╗╚██████╔╝██║ ╚═╝ ██║     ██║
 *  ██║██╗  ╚══════╝   ╚═╝   ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝     ╚═╝ ╚═╝ ╚═════╝ ╚═════╝ ╚═╝     ╚═╝  ██╗██║
 *  ╚═╝╚═╝                                                                                           ╚═╝╚═╝
 * StickPM Project
 * © 2024 BadNintendo - Quantum Phrase Relay Module
 * All rights reserved.
 * Unauthorized copying of this file, via any medium, is strictly prohibited.
 * 
 * USAGE:
 * This software is provided 'as-is', without express or implied warranty. The authors are
 * not liable for damages arising from its use.
 * 
 * You may use this software for personal and commercial purposes under the following conditions:
 * 1. Do not misrepresent the origin of the software; do not claim it as your own.
 * 2. Altered versions must be marked as such and not misrepresented as the original.
 * 3. This notice must remain intact in all source distributions.
 * 
 * CONTEXT:
 * This module, `QPRx2025`, offers random value generation via various algorithms:
 * 1. Initialization (`init(seed)`): Sets up the module with a seed and mixes entropy from the current timestamp.
 * 2. Entropy Mixing (`mixEntropy(value)`): Generates entropy using bitwise operations.
 * 3. Linear Congruential Generator (`lcg([a, c, m])`): Produces pseudo-random numbers using default or provided parameters.
 * 4. Mersenne Twister (`mersenneTwister()`): Generates high-quality random numbers with bitwise operations and tempering.
 * 5. Quantum Polls Relay (`QuantumPollsRelay(max)`): Combines LCG and Mersenne Twister results for random numbers within a range.
 * 6. Random Character Generation (`generateCharacters(length)`): Creates a random string of characters from a set.
 * 7. Random Option Selection (`theOptions(options)`): Chooses a random option from an array.
 * 8. Random Participant Selection (`theRewarded(participants)`): Selects a random participant from a list.
 * 9. UUID Generation (`generateUUID()`): Generates a UUID-like string with Mersenne Twister and specific formatting.
 * 10. Custom Hash (`customHash(input, salt, hash)`): Produces a secure hash from input and salt using a custom algorithm & Checks if a hash matches the generated hash from input and salt.
 * 11. Encryption & Decryption (`xorCipher(input, key)`): Perform XOR cipher encryption or decryption.
 */


const QPRx2025 = {
	seed: 0,
	entropy: 0,
	CHARACTERS: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
	BINARY: '0111001101110100011010010110001101101011011100000110110100101110011000110110111101101101',
	LCG_PARAMS: {
		a: 1664525,
		c: 1013904223,
		m: 4294967296
	},

	/** Initialize the QPRx2025 module with a seed value.
	 * @param {number} seed - The seed value for initialization.
	 */

	init(seed) {
		this.seed = seed % 1000000;
		this.entropy = this.mixEntropy(Date.now());
	},

	/** Mix entropy based on the given value.
	 * @param {number} value - The value to mix for entropy.
	 * @returns {number} - The mixed entropy value.
	 */
	mixEntropy(value) {
		return value ^ (value >>> 32) ^ (value >>> 16) ^ (value >>> 8) ^ value; // may change and remove 16 and 8  or merge
	},

	/** Linear Congruential Generator (LCG).
	 * @param {number} [a=this.LCG_PARAMS.a] - Multiplier parameter.
	 * @param {number} [c=this.LCG_PARAMS.c] - Increment parameter.
	 * @param {number} [m=this.LCG_PARAMS.m] - Modulus parameter.
	 * @returns {number} - Generated random number.
	 */
	lcg(a = this.LCG_PARAMS.a, c = this.LCG_PARAMS.c, m = this.LCG_PARAMS.m) {
		this.seed = (a * this.seed + c + this.entropy) % m;
		this.entropy = this.mixEntropy(this.seed + Date.now());
		return this.seed;
	},

	/** Mersenne Twister algorithm for generating random numbers.
	 * @returns {number} - Generated random number.
	 */
	mersenneTwister() {
		const MT = new Array(624).fill(0);
		let index = 0;
		const initialize = (seed) => {
			MT[0] = seed;
			for (let i = 1; i < 624; i++) {
				MT[i] = (0x6c078965 * (MT[i - 1] ^ (MT[i - 1] >>> 30)) + i) >>> 0;
			}
		};
		const generateNumbers = () => {
			for (let i = 0; i < 624; i++) {
				const y = (MT[i] & 0x80000000) + (MT[(i + 1) % 624] & 0x7fffffff);
				MT[i] = MT[(i + 397) % 624] ^ (y >>> 1);
				if (y % 2 !== 0) MT[i] ^= 0x9908b0df;
			}
		};
		const extractNumber = () => {
			if (index === 0) generateNumbers();
			let y = MT[index];
			y ^= y >>> 11;
			y ^= (y << 7) & 0x9d2c5680;
			y ^= (y << 15) & 0xefc60000;
			y ^= y >>> 18;
			index = (index + 1) % 624;
			return y >>> 0;
		};
		initialize(this.seed);
		return extractNumber();
	},

	/** Generate a random value within a specified range.
	 * @param {number} max - The maximum value for the relay.
	 * @returns {number} - Generated relay number.
	 * @throws {Error} - Throws an error if max is not a positive number.
	 */
	QuantumPollsRelay(max) {
		if (typeof max !== 'number' || max <= 0) throw new Error('Invalid max value for QuantumPollsRelay');
		const lcgValue = this.lcg();
		const mtValue = this.mersenneTwister();
		return ((lcgValue + mtValue) % 1000000) % max;
	},

	/** Generate a string of random characters of a specified length.
	 * @param {number} length - The length of the characters.
	 * @returns {string} - Generated characters.
	 * @throws {Error} - Throws an error if length is not a positive number.
	 */
	/*generateCharacters(length) {
		if (typeof length !== 'number' || length <= 0) throw new Error('Invalid length for generateCharacters');
		return Array.from({ length }, () => this.CHARACTERS.charAt(this.QuantumPollsRelay(this.CHARACTERS.length))).join('');
	},*/
	generateCharacters(length) {
		if (!Number.isInteger(length) || length <= 0) throw new Error('Invalid length for generateCharacters');
		let result = '';
		for (let i = 0; i < length; i++) {
			const index = this.QuantumPollsRelay(this.CHARACTERS.length);
			result += this.CHARACTERS[index];
		}
		return result;
	},

	/** Select an option randomly from a list of options.
	 * @param {Array} options - List of options to select from.
	 * @returns {*} - Selected option.
	 * @throws {Error} - Throws an error if no options are provided.
	 */
	theOptions(options) {
		if (!Array.isArray(options) || options.length === 0) throw new Error('No options provided');
		return options[this.QuantumPollsRelay(options.length)];
	},

	/** Select a rewarded participant randomly from a list of participants.
	 * @param {Array} participants - List of participants to select from.
	 * @returns {*} - Selected participant.
	 * @throws {Error} - Throws an error if no participants are provided.
	 */
	theRewarded(participants) {
		if (!Array.isArray(participants) || participants.length === 0) throw new Error('No participants provided');
		return participants[this.QuantumPollsRelay(participants.length)];
	},

	/** Generate a UUID-like string using custom algorithms.
	 * @returns {string} - Generated UUID-like string.
	 */
	generateUUID() { //add this.QuantumPollsRelay(256) for more randomness
		const bytes = Array.from({ length: 16 }, () => this.mersenneTwister() + this.QuantumPollsRelay(256) & 0xff);
		bytes[6] = (bytes[6] & 0x0f) | 0x40;
		bytes[8] = (bytes[8] & 0x3f) | 0x80;
		return bytes.map(b => b.toString(16).padStart(2, '0')).join('')
			.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
	},

	/** Generate a secure hash using a custom hashing algorithm.
	 * @param {string} input - The input string to hash.
	 * @param {string} salt - The salt to add to the hash. (defaults to an empty string if not provided)
	 * @param {boolean | string} hash - If a string, the hash to compare against for verification.
	 * @returns {string | boolean} - The resulting hash, or a boolean if hash verification is requested.
	 */
	customHash(input, salt = '', hash = false) {
		const hashing = (input, salt) => {
			const combined = `${input}${salt}`;
			let hashed = 0x811c9dc5;
			for (const char of combined) {
				hashed ^= char.charCodeAt(0);
				hashed = Math.imul(hashed, 0x01000193);
			}
			return (hashed >>> 0).toString(16).padStart(8, '0');
		};
		const verifyHash = (input, salt, hashed) => {
			const generatedHash = hashing(input, salt);
			return generatedHash === hashed;
		};
		if (typeof hash === 'string') return verifyHash(input, salt, hash);
		return hashing(input, salt);
	},

   /** Perform XOR cipher encryption or decryption.
	 * @param {string} input - The input text to encrypt or decrypt.
	 * @param {string} key - The key used for the XOR cipher.
	 * @returns {string} - The resulting encrypted or decrypted text.
	 */
	xorCipher(input, key) {
		let result = '';
		for (let i = 0; i < input.length; i++) {
			const charCode = input.charCodeAt(i) ^ key.charCodeAt(i % key.length);
			result += String.fromCharCode(charCode);
		}
		return result;
	}
};

module.exports = QPRx2025;