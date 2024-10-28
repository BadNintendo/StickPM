/*  ██╗██╗                                                                                           ██╗██╗
 *  ██║╚═╝  ███████╗████████╗██╗ ██████╗██╗  ██╗██████╗ ███╗   ███╗     ██████╗ ██████╗ ███╗   ███╗  ╚═╝██║
 *  ██║     ██╔════╝╚══██╔══╝██║██╔════╝██║ ██╔╝██╔══██╗████╗ ████║    ██╔════╝██╔═══██╗████╗ ████║     ██║
 *  ██║     ███████╗   ██║   ██║██║     █████╔╝ ██████╔╝██╔████╔██║    ██║     ██║   ██║██╔████╔██║     ██║
 *  ██║     ╚════██║   ██║   ██║██║     ██╔═██╗ ██╔═══╝ ██║╚██╔╝██║    ██║     ██║   ██║██║╚██╔╝██║     ██║
 *  ██║     ███████║   ██║   ██║╚██████╗██║  ██╗██║     ██║ ╚═╝ ██║ ██╗╚██████╗╚██████╔╝██║ ╚═╝ ██║     ██║
 *  ██║██╗  ╚══════╝   ╚═╝   ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝     ╚═╝ ╚═╝ ╚═════╝ ╚═════╝ ╚═╝     ╚═╝  ██╗██║
 *  ╚═╝╚═╝                                                                                           ╚═╝╚═╝
 * StickPM Project
 * © 2024 BadNintendo - Misc & Middleware Module
 * All rights reserved.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * 
 * USAGE:
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 * 
 * You are permitted to use this software for personal and commercial
 * applications, provided the following conditions are met:
 * 1. The origin of this software must not be misrepresented; you must
 *	not claim that you wrote the original software.
 * 2. Altered source versions must be plainly marked as such, and must
 *	not be misrepresented as being the original software.
 * 3. This notice may not be removed or altered from any source
 *	distribution.
 * 
 * CONTEXT:
 * This module provides utility functions for various purposes such as 
 * sending email notifications, performing sentiment analysis, sanitizing 
 * inputs, validating email and phone formats, generating secure random values, 
 * monitoring user activity, and logging errors in a structured format. 
 * It also includes functions for handling account verification and password reset notifications.
 * 
 * Need To-Do:
 * 1. Give room owners the extra credits over 365 days with proper transaction logs.
 */

const { check, sanitize } = require('express-validator');
const nodemailer = require('nodemailer');
const QPRx2025 = require('./QPRx2025');
const path = require('path');
const fs = require('fs');

const {
	findUserByEmailOrPhone,
	findUserByUsername,
	findUserById
} = require('./database');

/** Initialize QPRx2025 with the current timestamp for random number generation. */
QPRx2025.init(Date.now());

/** Checks if the given value is a string of digits only.
 * @param {string} value - The input string to validate.
 * @returns {boolean} - Returns true if the value contains only digits, false otherwise.
 */
const isDigit = value => /^\d+$/.test(value);

/** Validate that the provided value is a valid alphanumeric string.
 * @param {string} str - The string to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
const validateAlphanumeric = (str) => /^[a-zA-Z0-9-_]+$/.test(str);

/** Validate if a room name is URL-safe and within length limits.
 * @param {string} name - The room name to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
const validateRoomName = (name) => /^[a-zA-Z0-9-_~%]{3,35}$/.test(name);

/** Sanitize the provided message by removing potentially harmful characters and ensuring it is safe for storage.
 * @param {string} message - The message to sanitize.
 * @returns {string} - The sanitized message.
 */
const sanitizeMessage = (message) => message.replace(/[\x00-\x1F\x7F]/g, '');

/** Validate if the provided value is a valid timestamp.
 * Supports various formats including HH:MM:SS, MM:SS, and numeric digits.
 * @param {string} time - The timestamp string to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
const validateTimestamp = (time) => /^(\d{1,2}:){0,2}\d{1,2}$|^\d+$/.test(time);

/** Generic validation function for socket listener parameters.
 * @param {Object} data - The data object containing properties to validate.
 * @param {Object} rules - An object mapping property names to validation functions.
 * @returns {boolean} - True if all validations pass, false otherwise.
 * Need to return error for key in data with proper names
 */
const validateParams = (data, rules) => Object.entries(rules).every(([key, validator]) => validator(data[key]));

/** Sanitizes input by trimming, escaping, and removing unwanted characters.
 * Utilizes a library for additional sanitization if needed.
 * @param {string} value - The value to sanitize.
 * @returns {string} - The sanitized value.
 * @throws {TypeError} - Throws error if input is not a string.
 */
const sanitizeInput = (value) => {
	if (typeof value !== 'string') throw new TypeError('Input must be a string.');
	return value.trim().replace(/[<>"'\\]/g, '').replace(/[\x00-\x1F\x7F-\x9F]/g, '');
};

/** Validate that the provided value is a valid UUID or Socket ID.
 * @param {string} uuid - The UUID or Socket ID string to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
const validateUUID = (uuid) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid) ||
	/^[a-zA-Z0-9_-]{20,}$/i.test(uuid);

/** Validate if the given SDP data matches the SDP regex format.
 * @param {string} sdpData - The SDP data to validate.
 * @returns {boolean} - Returns true if the SDP data is valid, false otherwise.
 */
const validateSDP = (sdpData) => /^(v=0\r?\n)?(o=[^ ]+ [^ ]+ [^ ]+ IN (IP4|IP6) [^\r\n]+\r?\n)?(s=[^\r\n]+\r?\n)?(t=[0-9]+ [0-9]+\r?\n)?(c=IN (IP4|IP6) [^\r\n]+\r?\n)?(m=[^\r\n]+\r?\n)+(a=[^\r\n]+\r?\n)*$/gm.test(sdpData); 

	
/** Validates an email address based on a specific regex pattern..
 * @param {string} email - The email address to be validated.
 * @returns {boolean} - Returns true if the email is valid according to the regex pattern; otherwise, returns false.
 */
const validateEmail = (email) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]{2,}$/.test(email);

/** Validates a phone number based on a specific regex pattern.
 * @param {string} phone - The phone number to be validated.
 * @returns {boolean} - Returns true if the phone number is valid according to the regex pattern; otherwise, returns false.
 */
const validatePhoneNumber = (phone) =>  /^\+?[1-9]\d{1,2} ?(?:\(?\d{1,4}\)? ?)?(?:\d{1,4}[ .-]?){1,3}\d{1,4}$/.test(phone);

/** Validate if an array of options is valid.
 * Each option must be a non-empty string with only alphanumeric characters and spaces.
 * @param {Array<string>} options - The array of options to validate.
 * @returns {boolean} - True if all options are valid, false otherwise.
 */
const validateOptions = (options) => Array.isArray(options) && options.every(option => typeof option === 'string' && option.trim().length > 0 && /^[a-zA-Z0-9 ]+$/.test(option));

/** Sanitizes and validates base64 encoded image data.
 * @param {string} imageData - The Base64 encoded image data.
 * @returns {string} - The sanitized base64 image data.
 * @throws {Error} - Throws an error if the image format is invalid or if the sanitization process fails.
 */
const sanitizeImageData = async (imageData) => {
    try {
        const dataUrlRegex = /^data:image\/(png|jpeg|jpg|gif);base64,/;
        if (!dataUrlRegex.test(imageData)) throw new Error('Invalid image format. Only JPEG, PNG, and GIF are allowed.');
        const matches = imageData.match(dataUrlRegex);
        const mimeType = matches[1];
        const base64Data = imageData.replace(dataUrlRegex, '');
        const fileSizeInBytes = Buffer.byteLength(base64Data, 'base64');
        const maxSizeInBytes = 5 * 1024 * 1024;
        if (fileSizeInBytes > maxSizeInBytes)  throw new Error('Profile photo must be less than 5MB.');
        const cleanedData = base64Data.replace(/[^A-Za-z0-9+/=]/g, '');
        const sanitizedImageData = `data:image/${mimeType};base64,${cleanedData}`;
        return sanitizedImageData;
    } catch (error) {
        console.error('Image sanitization error:', error);
        throw new Error(error.message || 'Failed to sanitize image data.');
    }
};

/** Masks an email address the first and last characters of the local part and 
 * the first character of the domain, with the top-level domain visible.
 * @param {string} email - The email address to be masked.
 * @returns {string} - A masked version of the email address.
 */
const maskEmail = (email) => {
	const [local, domain] = email.split('@');
	const maskedLocal = `${local[0]}${'*'.repeat(Math.max(local.length - 2, 1))}${local.slice(-1)}`;
	const [domainName, ...tld] = domain.split('.');
    const maskedDomain = `${domainName[0]}${'*'.repeat(domainName.length - 1)}.${tld.join('.')}`;
    return `${maskedLocal}@${maskedDomain}`;
};

/** Mask the phone number to show only the last two digits and the country reference.
 * @param {string} phone - The recipient's phone number.
 * @returns {string} - A masked version of the phone number.
 */
function maskPhoneNumber(phone) {
    const countryCode = phone.startsWith('+') ? phone.slice(0, phone.length - 10) : '';
    const maskedNumber = `${'*'.repeat(phone.length - 2)}${phone.slice(-2)}`;
    return `${countryCode}${maskedNumber}`;
}

/** Configure nodemailer transporter. 
 * @constant {Object} transporter - The Nodemailer transporter object.
 */
const transporter = nodemailer.createTransport({
	host: 'localhost',
	port: process.env.MX_PORT,
	secure: false,
	tls: {
		rejectUnauthorized: false
	}
});

/** Send an email notification.
 * @param {string} to - The recipient's email address.
 * @param {string} subject - The subject of the email.
 * @param {string} text - The text content of the email.
 * @param {string} [html] - The HTML content of the email (optional).
 * @returns {Promise} - A promise that resolves when the email is sent.
 */
const sendNotification = (to, subject, text, html = '') => {
	const mailOptions = {
		from: `"${process.env.DOMAINNAME}" <no-reply@${process.env.DOMAIN}>`,
		to,
		subject,
		text,
		html
	};
	return transporter.sendMail(mailOptions)
		.then(info => {
			console.log('Email sent: ' + info.response);
			return info.response;
		})
		.catch(error => {
			console.error('Error sending email: ', error);
			throw error;
		});
};

/** Forwards an email to the specified recipient using the sendNotification function.
 * @param {string} emailContent - The content of the email to forward.
 * @param {string} recipient - The recipient email address.
 * @returns {Promise} - A promise that resolves when the email is forwarded.
 */
const forwardEmail = (emailContent, recipient) => {
	if (!recipient) {
		console.error('Recipient email address is not defined');
		return Promise.reject(new Error('Recipient not defined'));
	}
	return sendNotification(recipient, 'Forwarded Email', emailContent);
};


/** Unique cache file to store read email IDs */
const cacheFilePath = path.join(__dirname, 'processed_emails_cache.json');

/** Path to the user's mailbox file.
 * This is the location on the filesystem where incoming emails are stored.
 * The mailbox file is expected to contain all the email data for the user 
 * identified by the USERNAME environment variable.
 */
const mailboxPath = `/var/mail/${process.env.USERNAME}`;

/** Loads the cache of processed email IDs.
 * @param {function} callback - The callback to execute once the cache is loaded.
 * @returns {void}
 */
const loadProcessedEmailsCache = (callback) => {
	fs.readFile(cacheFilePath, 'utf8', (err, data) => {
		if (err) {
			if (err.code === 'ENOENT') {
				console.log('No cache file found. Starting fresh.');
				callback([]);
			} else {
				console.error('Error reading cache file:', err);
				callback([]);
			}
		} else {
			try {
				const processedEmails = JSON.parse(data);
				callback(processedEmails);
			} catch (parseError) {
				console.error('Error parsing cache file:', parseError);
				callback([]);
			}
		}
	});
};

/** Saves the updated cache of processed email IDs.
 * @param {Array} processedEmails - The array of processed email IDs.
 * @returns {void}
 */
const saveProcessedEmailsCache = (processedEmails) => {
	fs.writeFile(cacheFilePath, JSON.stringify(processedEmails), 'utf8', (err) => {
		if (err) console.error('Error saving cache file:', err);
		else console.log('Cache file updated.');
	});
};

/** Reads incoming emails and processes them based on the sender's username.
 * Emails are forwarded to the corresponding user or a default email if the user is not found.
 * @param {string} emailData - The raw data read from the mailbox file.
 * @returns {void}
 */
const processIncomingEmails = async (emailData) => {
	try {
		if (!emailData || typeof emailData !== 'string') throw new Error('Invalid email data provided.');
		const emails = emailData.split('\n\n').filter(email => email.trim().length > 0);
		if (emails.length === 0) return;
		loadProcessedEmailsCache(async (processedEmails) => {
			//const newProcessedEmails = [...processedEmails];
			const newProcessedEmails = [...processedEmails];
			await Promise.all(emails.map(async (email, index) => {
				try {
					const [headers, ...bodyParts] = email.split('\n');
					if (!headers || headers.length === 0) throw new Error('Missing email headers.');
					const body = bodyParts.join('\n');
					const fromMatch = headers.match(/From: (.+@.+)/);
					if (!fromMatch || !fromMatch[1])  throw new Error('Invalid or missing "From" field in headers.');
					const fromEmail = fromMatch[1].trim().toLowerCase();
					const senderUsername = fromEmail.split('@')[0];
					const emailIdentifier = email.substring(0, 50);
					if (processedEmails.includes(emailIdentifier)) {
						console.log(`Email ${index + 1} already processed. Skipping.`);
						return;
					}
					const user = findUserByUsername(senderUsername) || findUserByEmailOrPhone(fromEmail);
					if (user) {
						await forwardEmail(body, user.email);
						console.log(`Email forwarded to ${user.email} for user ${user.username || user.email}.`);
					} else {
						await forwardEmail(body, process.env.FORWARDEMAILSTO);
						console.log(`No user found for ${senderUsername}. Email forwarded to default.`);
					}
					newProcessedEmails.push(emailIdentifier);
					saveProcessedEmailsCache(newProcessedEmails);
				} catch (err) {
					console.error(`Error processing email: ${err.message}`);
				}
			}));
		});
	} catch (err) {
		console.error(`Failed to process incoming emails: ${err.message}`);
	}
};

/** Reads the mailbox file and processes the email data.
 * @function
 * @returns {void}
 */
const readEmails = () => {
	fs.readFile(mailboxPath, 'utf8', (err, data) => {
		if (err) {
			console.error('Error reading mailbox:', err);
			return;
		}
		parseEmails(data); //Disabled when ready to use usernames and emails
		//processIncomingEmails(data);
	});
};

/** Send phone verification code.
 * @param {Object} user - The user object containing phone.
 * @param {string} code - The phone verification code.
 * @returns {Promise} - A promise that resolves when the SMS is sent.
 */
const sendPhoneVerificationCode = async (user, code) => {
	if (!validatePhoneNumber(user.phone)) throw new Error('Invalid phone number');
	const message = `Your phone verification code is: ${code}`;
	await sendSMSNotification(user.phone, message);
};

/** Analyzes the sentiment of the given text and provides a detailed analysis.
 * @param {string} text - The text to analyze.
 * @returns {Object} - The sentiment analysis result including score, comparative score, and tokens.
 */
const analyzeSentiment = (text) => {
	const words = tokenize(text);
	const { sentimentScore, tokens } = computeSentimentScore(words);
	const enhancedAnalysis = {
		score: sentimentScore,
		comparative: sentimentScore / words.length,
		tokens,
		contextScore: contextAnalysis(text, words)
	};
	return enhancedAnalysis;
};

/** Tokenizes the text into words.
 * @param {string} text - The text to tokenize.
 * @returns {Array} - Array of tokens.
 */
const tokenize = (text) => {
	return text.toLowerCase().split(/\W+/).filter(word => word.length > 0);
};

/** Parses the raw email data into individual emails and forwards them.
 * @param {string} emailData - The raw data read from the mailbox file.
 * @returns {void}
 */
const parseEmails = (emailData) => {
	const emails = emailData.split('\n\n').filter(email => email.trim().length > 0);
	loadProcessedEmailsCache(processedEmails => {
		//const newProcessedEmails = [...processedEmails];
		const newProcessedEmails = [...processedEmails];
		emails.forEach((email, index) => {
			const emailId = QPRx2025.generateCharacters(16);
			const emailIdentifier = email.substring(0, 50);
			if (!processedEmails.includes(emailIdentifier) && validateEmail(email)) {
				console.log(`Forwarding Email ${index + 1}`);
				forwardEmail(email, process.env.FORWARDEMAILSTO)
					.then(() => {
						newProcessedEmails.push(emailIdentifier);
						saveProcessedEmailsCache(newProcessedEmails);
					})
					.catch(error => {
						console.error('Error forwarding email:', error);
					});
			} else console.log(`Email ${index + 1} already processed or invalid. Skipping.`);
		});
	});
};

/** Initializes the email monitoring process.
 * @returns {void}
 */
const startWatchingMailbox = () => {
	console.log('Starting to watch mailbox for new emails...');
	fs.watch(mailboxPath, (eventType, filename) => {
		if (filename && eventType === 'change') {
			console.log('Mailbox file changed. Processing new emails...');
			readEmails();
		}
	});
	readEmails();
};
//startWatchingMailbox();

/** Send an SMS notification to all known carriers.
 * @param {string} phone - The recipient's phone number.
 * @param {string} message - The message content of the SMS.
 * @returns {Promise} - A promise that resolves when the SMS is sent to all carriers.
 */
const sendSMSNotification = async (phone, message) => {
	const carrierEmailDomains = {
		// USA
		'AT&T': 'txt.att.net',
		'Verizon': 'vtext.com',
		'T-Mobile': 'tmomail.net',
		'Sprint': 'messaging.sprintpcs.com',
		'Boost Mobile': 'sms.myboostmobile.com',
		'Cricket': 'sms.cricketwireless.net',
		'Metro PCS': 'mymetropcs.com',
		'Tracfone': 'mmst5.tracfone.com',
		'U.S. Cellular': 'email.uscc.net',
		'Virgin Mobile': 'vmobl.com',
		// Canada
		'Bell Canada': 'txt.bell.ca',
		'Rogers': 'pcs.rogers.com',
		'Telus': 'msg.telus.com',
		'Fido': 'fido.ca',
		'Koodo': 'msg.koodomobile.com',
		'SaskTel': 'sms.sasktel.com',
		'Freedom Mobile': 'txt.freedommobile.ca',
		// UK
		'O2': 'o2.co.uk',
		'Vodafone': 'vodafone.co.uk',
		'EE': 'mms.ee.co.uk',
		'Three': 'three.co.uk',
		'Virgin Mobile UK': 'vxtras.com',
		// Australia
		'Telstra': 'm.telstra.com.au',
		'Optus': 'optusmobile.com.au',
		'Vodafone AU': 'pxt.vodafone.net.au',
		// France
		'Orange': 'orange.fr',
		'SFR': 'sfr.fr',
		'Bouygues Telecom': 'bouyguestelecom.fr',
		'Free Mobile': 'free.fr',
		// Germany
		'T-Mobile DE': 't-d1-sms.de',
		'Vodafone DE': 'vodafone-sms.de',
		'O2 DE': 'o2online.de',
		'E-Plus': 'eplus.de',
		// India
		'Vodafone IN': 'vodafone-sms.in',
		'Airtel': 'airtelmail.com',
		'Jio': 'jio.com',
		'BSNL': 'bsnl.in',
		'Idea': 'ideacellular.net',
		// Japan
		'SoftBank': 'softbank.ne.jp',
		'NTT DoCoMo': 'docomo.ne.jp',
		'KDDI': 'ezweb.ne.jp',
		// Spain
		'Movistar': 'movistar.com',
		'Vodafone ES': 'vodafone.es',
		'Orange ES': 'orange.es',
		// Mexico
		'Telcel': 'telcel.com',
		'Movistar MX': 'movistar.com.mx',
		'Nextel': 'nextel.com.mx',
		// Brazil
		'Claro': 'claro.com.br',
		'Vivo': 'vivo.com.br',
		'TIM': 'tim.it',
		'Oi': 'oi.com.br',
		// Sweden
		'Tele2': 'tele2.se',
		'Telenor SE': 'telenor.se',
		// Norway
		'Telenor': 'telenor.no',
		'Telia': 'telia.no'
	};
	const carrierEmails = Object.values(carrierEmailDomains).map(domain => `${phone}@${domain}`);
	try {
		const responses = await Promise.all(sendPromises);
		console.log('SMS sent to all carriers:', responses);
		return responses;
	} catch (error) {
		console.error('Error sending SMS:', error);
		throw error;
	}
};

/** Generates a HTML email template with enhanced styling and dynamic title.
 * @param {string} content - The main content of the email.
 * @param {string} title - The title of the email.
 * @returns {string} - The HTML string for the email template.
 */
const generateEmailTemplate = (content, title = 'Email Notification') => {
	return `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>${title} - ${process.env.DOMAIN}</title>
			<style>
				body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
				.container { width: 100%; max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
				.header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
				.header img { width: 150px; }
				.content { margin: 20px 0; font-size: 16px; line-height: 1.6; color: #333; }
				.button { display: inline-block; padding: 10px 20px; margin: 20px 0; font-size: 16px; color: #fff; background-color: #28a745; border: none; border-radius: 4px; text-decoration: none; text-align: center; }
				.button:hover { background-color: #218838; }
				.footer { text-align: center; padding: 10px 0; font-size: 12px; color: #777; border-top: 1px solid #eee; }
				.footer a { color: #007bff; text-decoration: none; }
				.footer a:hover { text-decoration: underline; }
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<img src="https://${process.env.DOMAIN}/images/logo.png" alt="Logo">
				</div>
				<div class="content">
					${content}
				</div>
				<div class="footer">
					<p>If you have any questions, feel free to <a href="https://${process.env.DOMAIN}/contact">contact us</a>.</p>
					<p><a href="https://${process.env.DOMAIN}/terms">Terms & Policy</a></p>
				</div>
			</div>
		</body>
		</html>
	`;
};

const sendConfirmationEmail = async (user, token) => { 
    if (!validateEmail(user.email)) throw new Error('Invalid email address');
    const isTokenDigit = /^\d+$/.test(token);
    let emailOptions;
    if (isTokenDigit) {
        emailOptions = {
            subject: 'Profile Changes Email Confirmation',
            text: `Please confirm your profile changes code: ${token}`,
            htmlContent: `<p>Dear ${user.firstName || user.username},</p>
                          <p>Please confirm your profile changes code: ${token}</p>
                          <p>If you did not request this email, please ignore it.</p>`
        };
    } else {
        const confirmUrl = `https://${process.env.DOMAIN}/confirm-email?token=${token}`;
        emailOptions = {
            subject: 'Register Email Confirmation',
            text: `Please confirm your email by clicking the following link: ${confirmUrl}`,
            htmlContent: `<p>Dear ${user.firstName || user.username},</p>
                          <p>Please confirm your email by clicking the following link:</p>
                          <p><a href="${confirmUrl}">Confirm Email</a></p>
                          <p>If you did not request this email, please ignore it.</p>`
        };
    }
    const html = generateEmailTemplate(emailOptions.htmlContent);
    await sendNotification(user.email, emailOptions.subject, emailOptions.text, html);
};

/** Send password reset email.
 * @param {Object} user - The user object containing email.
 * @param {string} token - The password reset token.
 * @returns {Promise} - A promise that resolves when the email is sent.
 */
const sendPasswordResetEmail = async (user, token) => {
	if (!validateEmail(user.email)) throw new Error('Invalid email address');
	const resetUrl = `https://${process.env.DOMAIN}/reset-password?token=${token}`;
	const subject = 'Password Reset Request';
	const text = `You requested a password reset. Please reset your password by clicking the following link: ${resetUrl}`;
	const htmlContent = `
		<p>Dear ${user.firstName || user.username},</p>
		<p>You requested a password reset. Please reset your password by clicking the following link:</p>
		<p><a href="${resetUrl}">Reset Password</a></p>
		<p>If you did not request this email, please ignore it.</p>
	`;
	const html = generateEmailTemplate(htmlContent);
	await sendNotification(user.email, subject, text, html);
};

/** Send password reset email or SMS.
 * @param {Object} user - The user object containing email or phone.
 * @param {string} token - The password reset token.
 * @returns {Promise} - A promise that resolves when the notification is sent.
 */
const sendPasswordResetNotification = async (user, token) => {
	const resetUrl = `https://${process.env.DOMAIN}/reset-password?token=${token}`;
	const subject = 'Password Reset';
	const text = `Please reset your password by clicking the following link: ${resetUrl}`;
	const htmlContent = `
		<p>Dear ${user.firstName || user.username},</p>
		<p>Please reset your password by clicking the following link:</p>
		<p><a href="${resetUrl}">Reset Password</a></p>
		<p>If you did not request this email, please ignore it.</p>
	`;
	const html = generateEmailTemplate(htmlContent);
	if (user.email) {
		if (!validateEmail(user.email)) throw new Error('Invalid email address');
		await sendNotification(user.email, subject, text, html);
	} else if (user.phone) {
		if (!validatePhoneNumber(user.phone)) throw new Error('Invalid phone number');
		await sendSMSNotification(user.phone, `Reset your password: ${resetUrl}`);
	} else throw new Error('User must have either an email or phone number');
};

/** Computes sentiment score from words.
 * @param {Array} words - Array of words from the text.
 * @returns {Object} - The sentiment score and tokens.
 */
const computeSentimentScore = (words) => {
	const sentimentKeywords = {
		positive: {
			words: ['good', 'great', 'awesome', 'yes', 'like', 'cool', 'sweet', 'nice', 'sick', 'amazing', 'fantastic', 'excellent', 'love', 'positive', 'excited', 'happy', 'joy', 'haha', 'lol', 'rofl', 'lmao', 'fun', 'win', 'victory', 'yay', 'yup', 'right', 'correct', 'agree', 'thanks', 'thank you', 'appreciate', 'perfect', 'beautiful', 'lovely', 'best','stoked', 'rad', 'lit', 'on point', 'fire', 'dope', 'legit', 'solid', 'stellar', 'rocking', 'ace', 'tight', 'top-notch', 'clutch', 'pumped', 'banging', 'killin it', 'crushing it', 'nailed it', 'nailed it', 'on fleek', 'boss', 'beast', 'gassed', 'wicked', 'savage', 'gnarly', 'epic', 'baller', 'prime', 'golden', 'mint', 'chill', 'breezy', 'hyped', 'score', 'bingo', 'jackpot', 'smashing', 'kickass', 'bomb', 'booming', 'banging'],
			score: 1
		},
		negative: {
			words: ['bad', 'terrible', 'no', 'not', 'dislike', 'awful', 'horrible', 'sad', 'angry', 'upset', 'hate', 'negative', 'annoyed', 'frustrated', 'wrong', 'incorrect', 'disagree', 'nah', 'nope', 'ugh', 'meh', 'worse', 'worst', 'ugly', 'disappointed', 'hurt', 'pain', 'suck', 'fail', 'loss','lame', 'trash', 'garbage', 'weak', 'busted', 'flop', 'messed up', 'screwed up', 'botched', 'flunked', 'dissed', 'sucks', 'blows', 'bogus', 'foul', 'iffy', 'janky', 'naff', 'pants', 'rubbish', 'sketchy', 'spotty', 'sucky', 'wonky', 'yucky', 'crappy', 'bummer', 'downer', 'drag', 'raw deal', 'slap in the face', 'sore point', 'stinker', 'bummed', 'pissed', 'miffed', 'irked', 'fuming', 'steamed', 'cheesed off', 'ticked off', 'salty', 'sour'],
			score: -1
		},
		neutral: {
			words: ['maybe', 'ok', 'fine', 'meh', 'alright', 'so-so', 'average', 'middle', 'neutral', 'idk', 'not sure', 'unsure', 'perhaps', 'could be', 'not bad', 'not good', 'mediocre', 'generally', 'usually', 'typically', 'kind of', 'sort of', 'okay','meh', 'whatever', 'fair', 'decent', 'middle-of-the-road', 'vanilla', 'plain', 'so-so', 'run-of-the-mill', 'standard', 'typical', 'common', 'regular', 'normal', 'ordinary', 'unremarkable', 'undistinguished', 'garden-variety', 'not bad', 'not great', 'nothing special', 'not up to much', 'nothing to write home about', 'bland', 'blah', 'humdrum', 'beige', 'generic', 'bog-standard', 'middling', 'passable', 'tolerable', 'adequate', 'satisfactory', 'acceptable', 'all right', 'fair-to-middling', 'no great shakes', 'not so hot', 'OK'],
			score: 0
		},
	};
	const sentimentScore = words.reduce((score, word) => {
		for (const [sentiment, { words: keywords, score: keywordScore }] of Object.entries(sentimentKeywords)) {
			if (keywords.includes(word))  return score + keywordScore;
		}
		return score;
	}, 0);
	return { sentimentScore, tokens: words };
};

/** Custom context analysis function.
 * Provides additional context-based sentiment analysis.
 * @param {string} text - The text to analyze.
 * @param {Array} words - Array of words from the text.
 * @returns {number} - The context score of the text.
 */
const contextAnalysis = (text, words) => {
	const contextKeywords = {
		// Positive Context
		urgent: 2,
		immediate: 2,
		important: 1,
		priority: 1,
		critical: 1.5,
		alert: 1.5,
		update: 1,
		new: 1,
		breaking: 2,
		resolved: 1,
		fixed: 1,
		success: 1,
		confirmed: 1,
		happy: 1,
		excited: 1.5,
		win: 1.5,
		good: 1,
		great: 1.5,
		awesome: 1.5,

		// Negative Context
		spam: -1,
		scam: -1,
		fraud: -2,
		fake: -2,
		phishing: -2,
		hack: -2,
		breach: -2,
		virus: -2,
		malware: -2,
		attack: -2,
		shutdown: -1.5,
		cancel: -1,
		delay: -1,
		failure: -1.5,
		error: -1,
		risk: -1.5,
		danger: -1.5,
		complaint: -1,
		issue: -1,
		problem: -1,
		blocked: -1.5,
		denied: -1,
		rejected: -1,
		refund: -1,
		unauthorized: -2,
		compromised: -2,
		sad: -1,
		angry: -1.5,
		hate: -2,
		bad: -1,
		terrible: -2,
		frustrated: -1.5,
		annoyed: -1.5,

		// Neutral Context
		note: 0,
		notice: 0,
		information: 0,
		update: 0,
		reminder: 0,
		not: -1
	};
	let contextScore = 0;
	const isNegation = (word) => word === 'not';
	for (let i = 0; i < words.length; i++) {
		const word = words[i];
		if (contextKeywords[word] !== undefined) {
			const weight = contextKeywords[word];
			if (i > 0 && isNegation(words[i - 1])) contextScore -= weight;
			else contextScore += weight;
		}
	}
	return contextScore;
};

/** Auth middleware for GET / type/userId/token validation.
 * @returns {Array} - Array of validation checks.
 */
const indexValidation = () => [
	check('type')
		.exists({ checkFalsy: true }).withMessage('Type is required')
		.isIn(['login', 'register', 'forgot', 'verify-phone', 'reset-password', 'logout']).withMessage('Invalid type value')
		.escape().trim(),
	  check('userId')
		.optional({ checkFalsy: true })
		.isUUID()
		.withMessage('Invalid userId format')
		.escape().trim(),
	  check('token')
		.optional({ checkFalsy: true })
		.isString()
		.withMessage('Invalid token format')
		.escape().trim()
];

/** Auth middleware for forgot email/phone validation.
 * @returns {Array} - Array of validation checks.
 */
const forgotValidation = () => [
	 check('identifier2')
		.not().isEmpty()
		.withMessage(`Email or Phone number is required.`)
		.trim()
		.escape()
		.customSanitizer(sanitizeInput)
		.custom((value) => {
			if (validateEmail(value) || validatePhoneNumber(value)) return true;
			else return Promise.reject(`Invalid email or phone number format.`);
		})
];

/** Auth middleware for user registration validation.
 * @returns {Array} - Array of validation checks.
 */
const registrationValidation = () => [
	check('username')
		.isLength({ min: 3, max: 32 })
		.withMessage(`Username must be between 3 and 32.`)
		.matches(/^[a-zA-Z0-9]+$/)
		.withMessage(`Username must contain only letters and numbers.`)
		.trim()
		.escape()
		.customSanitizer(sanitizeInput)
		.custom(async (value) => {
			const existingUser = findUserByUsername(value);
			if (existingUser) return Promise.reject('Username already exists.');
			return true;
		}),
	check('email')
		.optional({ checkFalsy: true })
		.isEmail()
		.withMessage(`Invalid email address.`)
		.normalizeEmail()
		.customSanitizer(sanitizeInput)
		.custom(async (value) => {
            if (!validateEmail(value)) return Promise.reject('Invalid email format.');
            const existingUsers = findUserByEmailOrPhone(value);
            if (existingUsers) return Promise.reject('Account associated with this email already registered.');
            return true;
        }),
	check('password')
		.isLength({ min: 4, max: 32 })
		.withMessage(`Password must be between 4 and 32 characters long.`)
		.trim()
		.escape()
		.customSanitizer(sanitizeInput),
	check('repeatPassword')
		.isLength({ min: 4, max: 32 })
		.withMessage(`Repeat password must be between 4 and 32 characters long.`)
		.trim()
		.escape()
		.customSanitizer(sanitizeInput)
		.custom((value, { req }) => {
			if (value !== req.body.password) return Promise.reject('Passwords do not match.');
			return true;
		}),
	check('firstName')
		.optional({ checkFalsy: true })
		.matches(/^[a-zA-Z]{1,32}$/)
		.withMessage(`First name must contain only alphabetic characters.`)
		.trim()
		.escape()
		.customSanitizer(sanitizeInput),
	check('lastName')
		.optional({ checkFalsy: true })
		.matches(/^[a-zA-Z]{1,32}$/)
		.withMessage(`Last name must contain only alphabetic characters.`)
		.trim()
		.escape()
		.customSanitizer(sanitizeInput),
	check('phone')
		.optional({ checkFalsy: true })
		.trim()
		.escape()
		.customSanitizer(sanitizeInput)
		.custom(async (value) => {
			if (!validatePhoneNumber(value)) return Promise.reject('Invalid phone number.');
            const existingUser = findUserByEmailOrPhone(value);
            if (existingUser) return Promise.reject('Account associated with this phone number already registered.');
            return true;
        }),
	check('profilePhoto')
        .optional({ checkFalsy: true })
        .custom(async (value, { req }) => {
            try {
                const sanitizedImage = await sanitizeImageData(value);
                req.profileImage = sanitizedImage;
                return true;
            } catch (error) {
                return Promise.reject(error.message || 'Invalid profile photo.');
            }
        }),
	check('private')
		.optional()
		.equals('on')
		.withMessage('Checkbox must be true if checked'),
	check('terms')
		.custom((value) => {
			if (value !== 'on') throw new Error('You must agree to the terms and conditions.');
			return true;
		}),
		check('captcha2')
		.not().isEmpty()
		.withMessage(`Captcha is required.`)
		.trim()
		.escape()
		.customSanitizer(sanitizeInput)
		.custom((value, { req }) => {
			if (value !== req.session.captcha) return Promise.reject('Invalid captcha.');
			return true;
		})
];

/** Auth middleware for login validation.
 * @returns {Array} - Array of validation checks.
 */
const loginValidation = () => [
	check('identifier')
		.notEmpty()
		.withMessage('Username, Email, or Phone number is required.')
		.trim()
		.escape()
		.customSanitizer(sanitizeInput)
		.custom(async (value, { req }) => {
			let user = {}, ifEmail = validateEmail(value), ifPhone = validatePhoneNumber(value);
			if (ifEmail || ifPhone) {
				user = findUserByEmailOrPhone(value);
				user.typeOf = (ifEmail) ? 'email' : 'phone';
			}
			else if (/^[a-zA-Z0-9]{3,32}$/.test(value)) user = findUserByUsername(value);
			else return Promise.reject('Invalid identifier format.');
			if (!user) return Promise.reject('Invalid credentials: User not found.');
			req.user = user;
			return true;
		}),
	check('password')
		.isLength({ min: 4, max: 32 })
		.withMessage('Password must be between 4 and 32 characters long.')
		.trim()
		.escape()
		.customSanitizer(sanitizeInput)
		.custom((value, { req }) => {
			if (!req.user)  return Promise.reject('User not found. Please check your identifier.');
			const isPasswordValid = QPRx2025.customHash(value, process.env.HASHUSERSALT || '10', req.user.password);
			if (!isPasswordValid) return Promise.reject('Invalid credentials: Incorrect password.');
			if (!req.user.verified)  return Promise.reject('Account not verified. Please check your email or phone for verification instructions.');
			return true;
		}),
	check('code')
		.customSanitizer(sanitizeInput)
		.custom((value, { req }) => {
			if (req.user && req.user.twoFactorEnabled) {
				if (!value) throw new Error('Verification code is required for 2FA.');
				if (value.length < 4 || value.length > 8) throw new Error('Verification code must be between 4 and 8 characters long.');
			}
			return true;
		})
		.optional({ checkFalsy: true })
		.trim()
		.escape()
		.customSanitizer(sanitizeInput),
	check('captcha')
		.notEmpty()
		.withMessage('Captcha is required.')
		.customSanitizer(sanitizeInput)
		.custom((value, { req }) => {
			console.log(req.session.captcha);
			if (value !== req.session.captcha) throw new Error('Invalid captcha.');
			return true;
		})
		.trim()
		.escape()
		.customSanitizer(sanitizeInput)
];

/** Auth middleware for password reset validation.
 * @returns {Array} - Array of validation checks.
 */
const resetPasswordValidation = () => [
	check('token')
		.not().isEmpty()
		.withMessage(`Reset token is required.`)
		.trim()
		.escape()
		.customSanitizer(sanitizeInput)
		.matches(/^[a-zA-Z0-9]+$/)
		.withMessage(`Invalid reset token format.`),
	check('password')
		.isLength({ min: 4, max: 32 })
		.withMessage(`Password must be between 4 and 32 characters long.`)
		.trim()
		.escape()
		.customSanitizer(sanitizeInput)
];

const confirmPhoneValidation = () => [
	check('userId')
		.not().isEmpty()
		.withMessage(`User ID is required.`)
		.trim()
		.escape()
		.customSanitizer(sanitizeInput)
		.matches(/^[a-zA-Z0-9]+$/)
		.withMessage(`Invalid User ID format.`),
	check('code')
		.not().isEmpty()
		.withMessage(`Verification code is required.`)
		.trim()
		.escape()
		.customSanitizer(sanitizeInput)
		.isLength({ min: 4, max: 8 })
		.withMessage(`Verification code must be between 4 and 8 characters long.`)
];

const confirmingEmail = () => [
	check('token')
		.not().isEmpty()
		.withMessage(`Email confirmation token is required.`)
		.trim()
		.escape()
		.customSanitizer(sanitizeInput)
		.withMessage(`Invalid token format.`)
];

const resettingPassword = () => [
	check('token')
		.not().isEmpty()
		.withMessage(`Reset token is required.`)
		.trim()
		.escape()
		.customSanitizer(sanitizeInput)
		.matches(/^[a-zA-Z0-9]+$/)
		.withMessage(`Invalid reset token format.`)
];

/** Validation rules for creating a new room.
 * Ensures the provided data is valid before creating a room.
 */
const createRoomValidation = () => [
	check('roomName').isString().trim().isLength({ min: 3, max: 35 }).withMessage('Room name is required.'),
	check('settings').optional().isObject().withMessage('Settings must be an object.')
];

/** Validation rules for a room.
 * Ensures the provided room ID is valid before proceeding.
 */
const roomValidation = () => [
	check('roomId').isUUID().withMessage('Invalid room ID.')
];

/** Validation rules for userId.
 * Ensures the provided user ID is valid before proceeding.
 */
const confirmProfile = () => [
	check('userId')
		.not().isEmpty()
		.withMessage(`User ID is required.`)
		.trim()
		.escape()
		.customSanitizer(sanitizeInput)
		.matches(/^[a-zA-Z0-9]+$/)
		.withMessage(`Invalid User ID format.`),
];

/** Validation rules for updating the user profile.
 * Ensures the provided data meets the required criteria for each profile field.
 */
const confirmProfileUpdate = () => [
	check('username')
		.optional()
		.isLength({ min: 3, max: 32 })
		.withMessage('Username must be between 3 and 32 characters.')
		.matches(/^[a-zA-Z0-9]+$/)
		.withMessage('Username must contain only letters and numbers.')
		.trim()
		.escape()
		.customSanitizer(sanitizeInput)
		.custom(async (value, { req }) => {
			const user = findUserById(req.params.userId);
			if (user.username !== value) {
				if (user.usernameChanges >= 2 && !user.isVip) throw new Error('Username change limit reached. Upgrade to VIP to change username.');
				if (restrictedNames.includes(value.toLowerCase()) || badWords.includes(value.toLowerCase())) throw new Error('Username contains restricted or inappropriate content.');
				const existingUser = findUserByUsername(value);
				if (existingUser) throw new Error('Username already exists.');
			} else if (user) req.user = user;
			return true;
		}),
	check('password')
		.optional()
		.isLength({ min: 4, max: 32 })
		.withMessage('Password must be between 4 and 32 characters long.')
		.trim()
		.escape()
		.customSanitizer(sanitizeInput),
	check('repeatPassword')
		.optional()
		.isLength({ min: 4, max: 32 })
		.withMessage(`Repeat password must be between 4 and 32 characters long.`)
		.trim()
		.escape()
		.customSanitizer(sanitizeInput)
		.custom((value, { req }) => {
			if (value !== req.body.password)  return Promise.reject('Passwords do not match.');
			return true;
		}),
	check('email')
		.optional()
		.isEmail()
		.withMessage('Invalid email address.')
		.normalizeEmail()
		.customSanitizer(sanitizeInput)
		.custom(async (value, { req }) => {
			const user = findUserById(req.params.userId);
			if (user.email !== value && !validateEmail(value)) throw new Error('Invalid email format.');
			else if (user) req.user = user;
			return true;
		}),
	check('phone')
		.optional()
		.trim()
		.escape()
		.customSanitizer(sanitizeInput)
		.custom(value => {
			if (!validatePhoneNumber(value)) throw new Error('Invalid phone number.');
			return true;
		}),
	check('firstName')
		.optional()
		.matches(/^[a-zA-Z]{1,32}$/)
		.withMessage('First name must contain only alphabetic characters.')
		.trim()
		.escape()
		.customSanitizer(sanitizeInput),
	check('lastName')
		.optional()
		.matches(/^[a-zA-Z]{1,32}$/)
		.withMessage('Last name must contain only alphabetic characters.')
		.trim()
		.escape()
		.customSanitizer(sanitizeInput),
	check('bio')
		.optional()
		.isLength({ max: 500 })
		.withMessage('Bio must be 500 characters or less.')
		.trim()
		.escape()
		.customSanitizer(sanitizeInput)
		.custom((value) => {
			if (badWords.some(badWord => value.toLowerCase().includes(badWord))) throw new Error('Bio contains restricted or inappropriate content.');
			return true;
		}),
	check('privacy')
		.optional()
		.isBoolean()
		.withMessage('Privacy must be a boolean value.')
		.toBoolean(),
	check('games')
		.optional()
		.isBoolean()
		.withMessage('Games must be a boolean value.')
		.toBoolean(),
	check('following')
		.optional()
		.isArray()
		.withMessage('Following must be an array.')
		.customSanitizer(sanitizeInput),
	check('blocked')
		.optional()
		.isArray()
		.withMessage('Blocked must be an array.')
		.customSanitizer(sanitizeInput)
		.custom((value, { req }) => { return true; }),
	check('profilePhoto')
        .optional({ checkFalsy: true })
        .custom(async (value, { req }) => {
            try {
                const sanitizedImage = await sanitizeImageData(value);
                req.profileImage = sanitizedImage;
                return true;
            } catch (error) {
                return Promise.reject(error.message || 'Invalid profile photo.');
            }
        }),
	check('terms')
		.custom((value) => {
			if (value !== 'on') throw new Error('You must agree to the terms and conditions.');
			return true;
		}),
	check('captcha2')
		.not().isEmpty()
		.withMessage(`Captcha is required.`)
		.trim()
		.escape()
		.customSanitizer(sanitizeInput)
		.custom((value, { req }) => {
			if (value !== req.session.captcha) return Promise.reject('Invalid captcha.');
			return true;
		}),
	check('code')
		.custom((value, { req }) => {
			if (req.user && req.user.code) {
				if (!value) throw new Error('Verification code is required.');
				if (value.length < 4 || value.length > 8) throw new Error('Verification code must be between 4 and 8 characters long.');
			}
			return true;
		})
		.optional()
		.trim()
		.escape()
		.customSanitizer(sanitizeInput),
];

/** Validation rules for setting a room topic.
 * Ensures the provided data is valid before updating the room topic.
 */
const setRoomTopicValidation = () => [
	check('roomId').isUUID().withMessage('Invalid room ID.'),
	check('topic').isString().trim().isLength({ min: 1 }).withMessage('Topic is required.')
];

/** Validation rules for sharing a file in a room.
 * Ensures the provided data is valid before sharing a file.
 */
const shareFileValidation = () => [
	check('roomId').isUUID().withMessage('Invalid room ID.'),
	check('file').isString().trim().isLength({ min: 1 }).withMessage('File is required.')
];

/** @param {Error} error - The error object.
 * @param {Object} [additionalContext={}] - Additional context to include in the log.
 */
const logError = (error, additionalContext = {}) => {
	const { message, stack } = error;
	const timestamp = new Date().toISOString();
	const errorLocation = stack.split('\n')[1] || '';
	const formattedStack = stack.replace(/\n/g, '\n\t');
	const logDetails = {
		timestamp,
		message,
		errorLocation: errorLocation.trim(),
		...additionalContext,
		stack: formattedStack
	};
	console.error(JSON.stringify(logDetails, null, 4));
};

/** Handles sending a JSON response with consistent structure.
 * @param {Object} res - The response object.
 * @param {number} statusCode - HTTP status code.
 * @param {string} status - 'success' or 'error'.
 * @param {string} message - Response message.
 * @param {Object} [data] - Additional data to send.
 */
const sendJsonResponse = (res, statusCode, status, message, data = {}) => {
    res.status(statusCode).json({
        status: status,
        message: message,
        ...data
    });
};

/** Test function to prefill data and call sendConfirmationEmail.
 * This function creates a mock user object and a sample token,
 * then attempts to send a confirmation email using the sendConfirmationEmail function.
 * It logs the result of the email sending operation.
 *
 * @param {Object} user - Mock user object containing:
 *   @param {string} user.email - The email address of the user.
 *   @param {string} user.firstName - The first name of the user.
 *   @param {string} user.username - The username of the user.
 * @param {string} token - The email confirmation token (sample token for testing).
 */
const testSendConfirmationEmail = async () => {
	const user = {
		email: process.env.FORWARDEMAILSTO,
		firstName: 'Testing',
		username: 'admin'
	};
	const sixDigit = Math.floor(100000 + QPRx2025.QuantumPollsRelay(900000));
	const token = sixDigit;
	try {
		await sendConfirmationEmail(user, token);
		console.log('Test email sent successfully.');
	} catch (error) {
		console.error('Test email failed:', error);
	}
};
//testSendConfirmationEmail();

module.exports = {
	sendPhoneVerificationCode,
	resetPasswordValidation,
	sendPasswordResetEmail,
	registrationValidation,
	setRoomTopicValidation,
	confirmPhoneValidation,
	sendConfirmationEmail,
	createRoomValidation,
	confirmProfileUpdate,
	validateAlphanumeric,
	sendSMSNotification,
	validatePhoneNumber,
	shareFileValidation,
	validateTimestamp,
	resettingPassword,
	sendNotification,
	analyzeSentiment,
	forgotValidation,
	validateRoomName,
	sendJsonResponse,
	loginValidation,
	sanitizeMessage,
	validateOptions,
	indexValidation,
	maskPhoneNumber,
	confirmingEmail,
	validateParams,
	roomValidation,
	confirmProfile,
	validateEmail,
	sanitizeInput,
	validateUUID,
	validateSDP,
	maskEmail,
	logError,
	isDigit
};