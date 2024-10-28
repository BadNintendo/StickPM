/*  ██╗██╗                                                                                           ██╗██╗
 *  ██║╚═╝  ███████╗████████╗██╗ ██████╗██╗  ██╗██████╗ ███╗   ███╗     ██████╗ ██████╗ ███╗   ███╗  ╚═╝██║
 *  ██║     ██╔════╝╚══██╔══╝██║██╔════╝██║ ██╔╝██╔══██╗████╗ ████║    ██╔════╝██╔═══██╗████╗ ████║     ██║
 *  ██║     ███████╗   ██║   ██║██║     █████╔╝ ██████╔╝██╔████╔██║    ██║     ██║   ██║██╔████╔██║     ██║
 *  ██║     ╚════██║   ██║   ██║██║     ██╔═██╗ ██╔═══╝ ██║╚██╔╝██║    ██║     ██║   ██║██║╚██╔╝██║     ██║
 *  ██║     ███████║   ██║   ██║╚██████╗██║  ██╗██║     ██║ ╚═╝ ██║ ██╗╚██████╗╚██████╔╝██║ ╚═╝ ██║     ██║
 *  ██║██╗  ╚══════╝   ╚═╝   ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝     ╚═╝ ╚═╝ ╚═════╝ ╚═════╝ ╚═╝     ╚═╝  ██╗██║
 *  ╚═╝╚═╝                                                                                           ╚═╝╚═╝
 *
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
 * This module configures middleware functions to enhance security, performance,
 * and logging in the Express app. It includes:
 * 1. Rate Limiting: Restricts request frequency from a single IP to prevent abuse.
 * 2. Request Logging: Captures detailed request info, including IP, location, and method.
 * 3. Security Enhancements:
 *	- Helmet: Secures HTTP headers against common attacks.
 *	- XSS Clean: Sanitizes inputs to prevent XSS attacks.
 *	- HPP: Protects against HTTP parameter pollution.
 *	- Content Security Policy: Limits content sources to reduce XSS risk.
 *	- Sanitization: Cleans user input to remove harmful data.
 *	- Custom Request Blocker: Blocks requests from known malicious IPs.
 *	- Enforce HTTPS: Redirects HTTP to HTTPS for encrypted communication.
 * 4. Session Management: Handles sessions with secure cookies and regeneration.
 * 5. Domain and IP Checking: Validates domains and checks IPs against blacklists.
 * 6. CSRF Protection: Validates CSRF tokens to prevent CSRF attacks.
 * 7. Error Handling: Manages errors and responds with appropriate messages.
 * 8. Registration Rate Limiting: Limits registration attempts to prevent abuse.
 * Functions are applied to the Express app for comprehensive protection
 * and optimal performance.
 * Module exports:
 * 1. domainCheckMiddleware: Validates domain-related requests.
 * 2. verificationLimiter: Limits verification request rates.
 * 3. sessionMiddleware: Manages user sessions.
 * 4. applyMiddlewares: Applies multiple middleware functions.
 * 5. registerLimiter: Limits registration attempt rates.
 * 6. forgotLimiter: Limits password recovery request rates.
 * 7. publicLimiter: Limits public-facing request rates.
 * 8. loginLimiter: Limits login attempt rates.
 * 
 * Need To-Do:
 */

const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const session = require('express-session');
const QPRx2025 = require('./QPRx2025');
const geoip = require('geoip-lite');
const morgan = require('morgan');
const multer = require('multer');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');

const upload = multer();

const {
	findUserByUsername,
	updateUserSessionData
} = require('./database');

/** Array of allowed domains.
 * @type {Array<string>}
 */
const allowedDomains = [
	'chathobby.com',
	'stickpm.com'
];

/** Array of allowed sub domains.
 * Subdomain for chat is allowed both with and without subdomain request for now
 * @type {Array<string>}
 */
const allowedSubDomains = ['chat'];

/** List of known malicious IP addresses.
 * @type {Array<string>}
 */
const blacklistedIps = ['52.169.127.62', '52.169.12.232'];

/** List of known IP ranges used by proxies and VPNs.
 * @type {Array<string>}
 */
const proxyVpnList = [
	'2001:41d0:202:100:91:134:128:42/128',
	'2607:5300:205:200::3e2a/128',
	'51.222.155.238/32',
	'91.134.128.42/32',
	'54.39.240.0/24',
	'144.217.9.0/24',
	'192.168.0.0/16',
	'169.254.0.0/16',
	'172.16.0.0/12',
	'213.32.4.0/24',
	'127.0.0.0/8',
	'10.0.0.0/8',
	'0.0.0.0/8'
];

/** Rate limit settings for users and bots.
 * @type {Object}
 */
const rateLimitConfig = {
	defaultUser: { 					windowMs: 60 * 60 * 1000, max: 50 },	// Regular users
	defaultBot: {					 windowMs: 60 * 60 * 1000, max: 150 },	// Unknown bots
	bots: {
		'Twitterbot': { 			windowMs: 15 * 60 * 1000, max: 80 },	// Twitter
		'Pinterest': { 				windowMs: 15 * 60 * 1000, max: 80 },	// Pinterest
		'Slackbot': { 				windowMs: 15 * 60 * 1000, max: 80 },	// Slack
		'LinkedInBot': { 			windowMs: 15 * 60 * 1000, max: 80 },	// LinkedIn
		'WhatsApp': { 				windowMs: 15 * 60 * 1000, max: 80 },	// WhatsApp
		'TikTokBot': { 				windowMs: 15 * 60 * 1000, max: 80 },	// TikTok
		'Discordbot': { 			windowMs: 15 * 60 * 1000, max: 80 },	// Discord
		'TelegramBot': { 			windowMs: 15 * 60 * 1000, max: 80 },	// Telegram
		'Redditbot': { 				windowMs: 15 * 60 * 1000, max: 80 },	// Reddit
		'Snapchat': { 				windowMs: 15 * 60 * 1000, max: 80 },	// Snapchat
		'facebookexternalhit': { 	windowMs: 15 * 60 * 1000, max: 100 },	// Facebook
		'Googlebot': { 				windowMs: 60 * 60 * 1000, max: 200 },	// Google Search
		'Bingbot': { 				windowMs: 60 * 60 * 1000, max: 200 },	// Bing Search
		'YandexBot': { 				windowMs: 60 * 60 * 1000, max: 200 },	// Yandex Search
		'DuckDuckBot': { 			windowMs: 60 * 60 * 1000, max: 200 },	// DuckDuckGo
		'Baiduspider': { 			windowMs: 60 * 60 * 1000, max: 200 },	// Baidu Search
		'Sogou': { 					windowMs: 60 * 60 * 1000, max: 200 },	// Sogou Search
		'Exabot': { 				windowMs: 60 * 60 * 1000, max: 200 },	// Exalead
		'Yahoo! Slurp': { 			windowMs: 60 * 60 * 1000, max: 200 },	// Yahoo Search
		'AhrefsBot': { 				windowMs: 60 * 60 * 1000, max: 200 },	// Ahrefs SEO Tool
		'SEMrushBot': { 			windowMs: 60 * 60 * 1000, max: 200 },	// SEMrush SEO Tool
		'MJ12bot': { 				windowMs: 60 * 60 * 1000, max: 200 },	// Majestic SEO Tool
		'DotBot': { 				windowMs: 60 * 60 * 1000, max: 200 },	// Moz SEO Tool
		'SiteAnalyzerBot': { 		windowMs: 60 * 60 * 1000, max: 200 },	// SiteAnalyzer SEO Tool
		'Mediapartners-Google': { 	windowMs: 60 * 60 * 1000, max: 200 },	// Google Adsense Crawler
		'AdsBot-Google': { 			windowMs: 60 * 60 * 1000, max: 200 },	// Google AdsBot
		'Applebot': { 				windowMs: 60 * 60 * 1000, max: 200 },	// Apple Search Engine
		'Google Favicon': { 		windowMs: 60 * 60 * 1000, max: 200 },	// Google Favicon bot
		'W3C_Validator': { 			windowMs: 60 * 60 * 1000, max: 200 },	// W3C Validator Bot
		'UptimeRobot': { 			windowMs: 60 * 60 * 1000, max: 200 },	// Uptime Monitoring Bot
		'PingdomBot': { 			windowMs: 60 * 60 * 1000, max: 200 },	// Pingdom Monitoring Bot
		'PhantomJS': { 				windowMs: 60 * 60 * 1000, max: 200 },	// SEO Monitoring (Headless Browser)
		'Feedfetcher-Google': { 	windowMs: 60 * 60 * 1000, max: 200 },	// Google Feed Fetcher
		'Flipboard': { 				windowMs: 60 * 60 * 1000, max: 200 },	// Flipboard Feed Crawler
		'AppleNewsBot': { 			windowMs: 60 * 60 * 1000, max: 200 },	// Apple News Bot
		'Feedly': { 				windowMs: 60 * 60 * 1000, max: 200 },	// Feedly RSS Reader Bot
		'Bloglovin': { 				windowMs: 60 * 60 * 1000, max: 200 },	// Bloglovin RSS Reader
		'PaperLiBot': { 			windowMs: 60 * 60 * 1000, max: 200 },	// Paper.li Feed Fetcher
		'Google-Site-Verification': { windowMs: 60 * 60 * 1000, max: 200 },	// Google Site Verification
		'Google-PageSpeedInsights': { windowMs: 60 * 60 * 1000, max: 200 },	// Google PageSpeed Insights
		'Google-Structured-Data-Testing-Tool': { windowMs: 60 * 60 * 1000, max: 200 },	// Google Structured Data Testing Tool
		'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)': { windowMs: 60 * 60 * 1000, max: 200 }	// IE Headless Bots
	},
};

/** Helper function to dynamically extract bot patterns from rateLimitConfig.
 * @returns {Array<string>} - An array of bot names.
 */
const botList = () => {
	return Object.keys(rateLimitConfig.bots).map(botName => botName.toLowerCase());
};

/** Payment API/IPN Configuration
 * @Params
 * - paypal: Configuration for PayPal API/IPN
 *   - clientId: PayPal client ID for API requests
 *   - secret: PayPal client secret for API requests
 *   - webhookUrl: URL endpoint for receiving PayPal IPN notifications
 *   - validateUrl: URL endpoint for validating PayPal webhook signatures
 * - stripe: Configuration for Stripe API/Webhooks
 *   - apiKey: Stripe API key for authentication
 *   - webhookSecret: Secret used to validate Stripe webhook events
 *   - webhookUrl: URL endpoint for receiving Stripe webhook notifications
 * - square: Configuration for Square API/Webhooks
 *   - accessToken: Square access token for API authentication
 *   - webhookUrl: URL endpoint for receiving Square webhook notifications
 * - adyen: Configuration for Adyen API/Webhooks
 *   - apiKey: Adyen API key for authentication
 *   - merchantAccount: Adyen merchant account identifier
 *   - webhookUrl: URL endpoint for receiving Adyen webhook notifications
 * - applePay: Configuration for Apple Pay API/Webhooks
 *   - merchantId: Apple Pay merchant identifier
 *   - merchantSecret: Apple Pay merchant secret for authentication
 *   - webhookUrl: URL endpoint for receiving Apple Pay notifications
 * - googlePay: Configuration for Google Pay API/Webhooks
 *   - merchantId: Google Pay merchant identifier
 *   - merchantSecret: Google Pay merchant secret for authentication
 *   - webhookUrl: URL endpoint for receiving Google Pay notifications
 */
const paymentConfig = {
    paypal: {
        clientId: process.env.PAYPALID || 'your-paypal-client-id',
        secret: process.env.PAYPALSECRET || 'your-paypal-secret',
        webhookUrl: `"https://${process.env.DOMAIN}/ipn/paypal`,
        validateUrl: 'https://api.paypal.com/v1/notifications/verify-webhook-signature'
    },
    stripe: {
        apiKey: process.env.STRIPEKEY || 'your-stripe-api-key',
        webhookSecret: process.env.STRIPESECRET || 'your-stripe-webhook-secret',
        webhookUrl: `https://${process.env.DOMAIN}/ipn/stripe`
    },
    square: {
        accessToken: process.env.SQUARETOKEN || 'your-square-access-token',
        webhookUrl: `https://${process.env.DOMAIN}/ipn/square`
    },
    adyen: {
        apiKey: process.env.ADYENKEY || 'your-adyen-api-key',
        merchantAccount: process.env.ADYENMERCHACC || 'your-merchant-account',
        webhookUrl: `https://${process.env.DOMAIN}/ipn/adyen`
    },
    applePay: {
        merchantId: process.env.APPLEID || 'your-apple-merchant-id',
        merchantSecret: process.env.APPLEMERCHSECRET || 'your-apple-merchant-secret',
        webhookUrl: `https://${process.env.DOMAIN}/ipn/applepay`
    },
    googlePay: {
        merchantId: process.env.GOOGLEID || 'your-google-merchant-id',
        merchantSecret: process.env.GOOGLEMERCHSECRET || 'your-google-merchant-secret',
        webhookUrl: `https://${process.env.DOMAIN}/ipn/googlepay`
    }
};

/** Initialize random number generator for QPRx2025 with current timestamp. */
QPRx2025.init(Date.now());

/** Handles incoming notifications for IPN or API requests.
 * Handles updating user credits and room donations.
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware function
 */
const handleTypeOfPayment = async (req, res, next) => {
    const { type, provider } = req.params;
    const paymentData = req.body;
    if (!paymentConfig[provider] || (type !== 'ipn' && type !== 'api')) return res.status(400).send('Invalid payment request');
    try {
        if (type === 'ipn') await handleIPNNotification(provider, paymentData, res);
        else if (type === 'api') await handleAPINotification(provider, paymentData, res);
    } catch (error) {
        console.error(`Error processing ${type} payment for ${provider}:`, error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

/** Handles IPN notifications for different providers.
 * Updates user credits based on payment success.
 * @param {string} provider - Payment provider (e.g., 'paypal', 'stripe').
 * @param {Object} paymentData - Payment data received from the provider.
 * @param {Object} res - The response object to send the status and message.
 */
const handleIPNNotification = async (provider, paymentData, res) => {
    try {
        let userId, amount;
        if (provider === 'paypal') {
            const isValid = await verifyPayPalIPN(paymentData);
            if (!isValid) throw new Error('Invalid PayPal IPN signature');
            userId = paymentData.custom;
            amount = parseFloat(paymentData.mc_gross);
        } else if (provider === 'stripe') {
            const event = await verifyStripeWebhook(paymentData, paymentConfig.stripe.webhookSecret);
            if (!event) throw new Error('Invalid Stripe Webhook signature');
            if (event.type === 'invoice.payment_succeeded') {
                userId = event.data.object.customer;
                amount = event.data.object.amount_paid / 100;
            }
        }
        await database.handlePayment(userId, { amount, paymentType: provider });
        console.log(`IPN notification processed for ${provider}`, paymentData);
        res.status(200).send(`IPN notification processed for ${provider}`);
    } catch (error) {
        res.status(500).json({ error: 'Failed to process IPN', details: error.message });
    }
};

/** Handles API notifications for different providers.
 * Updates user credits and processes room donations.
 * @param {string} provider - Payment provider (e.g., 'adyen', 'square').
 * @param {Object} paymentData - Payment data received from the provider.
 * @param {Object} res - The response object to send the status and message.
 */
const handleAPINotification = async (provider, paymentData, res) => {
    try {
        let userId, amount, roomId;
        if (provider === 'adyen') {
            userId = paymentData.userId;
            amount = paymentData.amount;
            roomId = paymentData.roomId;
        } else if (provider === 'square') {
            userId = paymentData.client_reference_id;
            amount = paymentData.amount_money.amount / 100;
        }
        if (roomId)  await database.processRoomDonation(userId, { donationAmount: amount, roomId });
        else await database.handlePayment(userId, { amount, paymentType: provider });
        console.log(`API notification processed for ${provider}`, paymentData);
        res.status(200).send(`API notification processed for ${provider}`);
    } catch (error) {
        res.status(500).json({ error: 'Failed to process API notification', details: error.message });
    }
};

/** This function would call PayPal's IPN verification endpoint.
 * @param {Object} paymentData - Payment data received from PayPal.
 * @returns {Promise<boolean>} - Whether the IPN is valid.
 */
const verifyPayPalIPN = async (paymentData) => {
    return true;
};

/** This function would use Stripe's library to validate the webhook signature.
 * @param {Object} paymentData - Payment data received from Stripe.
 * @param {string} webhookSecret - Stripe's webhook secret for validation.
 * @returns {Promise<Object|null>} - The decoded event object or null if verification fails.
 */
const verifyStripeWebhook = async (paymentData, webhookSecret) => {
    return { type: 'invoice.payment_succeeded', data: { object: { customer: 'user123', amount_paid: 5000 } } };
};

/** Create a stream that buffers data before writing it out.
 * @param {object} stream - Original stream.
 * @param {number} interval - Buffer flush interval in milliseconds.
 * @return {object} Buffered stream.
 */
const createBufferStream = (stream, interval) => {
	let buffer = [];
	let timer = null;
	function flush() {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
		stream.write(buffer.join(''));
		buffer = [];
	}
	return {
		write: (str) => {
			buffer.push(str);
			if (!timer) timer = setTimeout(flush, interval);
		}
	};
};

/** Block requests based on URL patterns and blacklisted IPs.
 * @param {Object} req - Request object.
 * @param {Object} res - Response object.
 * @param {Function} next - Next function.
 */
const customRequestBlocker = (req, res, next) => {
	const blacklistPatterns = [
		/\/\?XDEBUG_SESSION_START=/,
		/\/cgi-bin\//,
		/\/druid\//,
		/\/luci\//,
		/\/hudson/,
		/\/actuator\/gateway\//,
		/\/jquery\/uploader\//
	];
	const isMaliciousRequest = blacklistPatterns.some((pattern) => pattern.test(req.url));
	const isBlacklistedIp = blacklistedIps.includes(req.ip);
	if (isMaliciousRequest || isBlacklistedIp) {
		return res.status(403).send('Forbidden');
	}
	next();
};

/** Sanitize input by escaping HTML and special characters.
 * @param {string} input - Input string to sanitize.
 * @returns {string} Sanitized input string.
 */
const sanitizeInput = (input) => {
		let sanitized = input.replace(/</g, "&lt;").replace(/>/g, "&gt;");
		sanitized = sanitized.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
		sanitized = sanitized.replace(/javascript:/gi, "")
			.replace(/vbscript:/gi, "")
			.replace(/on\w+=/gi, "");
		sanitized = sanitized.replace(/style=/gi, "style-disabled=")
			.replace(/href=/gi, "href-disabled=")
			.replace(/src=/gi, "src-disabled=");
		sanitized = sanitized.replace(/[^a-zA-Z0-9 .,?!@#\$%\^&\*\(\)\-_=\+\[\]{};:'"\\|\/<>\`~]/g, "");
		return sanitized.trim();
};

/** Sanitize all string properties in request body.
 * @param {Object} req - Request object.
 * @param {Object} res - Response object.
 * @param {Function} next - Next function.
 */
const sanitizeInputs = (req, res, next) => {
	for (let prop in req.body) {
		if (req.body.hasOwnProperty(prop) && typeof req.body[prop] === 'string') req.body[prop] = sanitizeInput(req.body[prop]);
	}
	next();
};

/** Function to check if an IP address is within a specified IP range.
 * @param {string} ip - The IP address to check, formatted as a string (e.g., '192.168.1.1').
 * @param {string} range - The IP range to check against, formatted as a CIDR block (e.g., '192.168.0.0/16').
 * @returns {boolean} - Returns `true` if the IP address falls within the specified range, otherwise `false`.
 */
const ipInRange = (ip, range) => {
	const [rangeIp, rangeMask] = range.split('/');
	const ipInt = ip.split('.').map(Number).reduce((acc, octet) => (acc << 8) + octet, 0);
	const rangeIpInt = rangeIp.split('.').map(Number).reduce((acc, octet) => (acc << 8) + octet, 0);
	const mask = -1 << (32 - rangeMask);
	return (ipInt & mask) === (rangeIpInt & mask);
};

/** Function to detect if an IP address is likely to be a proxy or VPN.
 * @param {string} ip - The IP address to check, formatted as a string (e.g., '192.168.1.1').
 * @returns {boolean} - Returns `true` if the IP address matches known proxy or VPN ranges, otherwise `false`.
 */
const isProxyOrVpn = (ip) => proxyVpnList.some(range => ipInRange(ip, range));

/** Function to log request details including IP, ISP, geographical information, route, and method, along with subdomain, and detection of bots, spiders, or proxies.
 * @param {Object} req - The request object, containing headers, path, and other request details.
 * @param {Object} res - The response object, used to send a response to the client.
 * @param {Function} next - The next function in the stack, called to pass control to the next middleware.
 */
const logRequestDetails = (req, res, next) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    const realIp = forwardedFor ? forwardedFor.split(',')[0].trim() : req.connection.remoteAddress;
    const detectedProxyOrVpn = isProxyOrVpn(realIp);
    const geo = geoip.lookup(realIp);
    const fullHostname = req.hostname;
    const baseDomain = getBaseDomain(fullHostname);
    const subdomain = fullHostname.replace(`.${baseDomain}`, '');
    const userAgent = req.headers['user-agent']?.toLowerCase() || '';
    const isBotOrSpider =  botList().some(bot => userAgent.includes(bot));
    const logDetails = {
        timestamp: new Date().toISOString(),
        realIp,
        detectedProxyOrVpn,
        isp: geo ? geo.org : 'Unknown',
        country: geo ? geo.country : 'Unknown',
        region: geo ? geo.region : 'Unknown',
        city: geo ? geo.city : 'Unknown',
        route: req.path,
        method: req.method,
        subdomain: subdomain || 'No subdomain',
        isBotOrSpider,
        userAgent: isBotOrSpider ? userAgent : 'User-Agent Hidden for Privacy'
    };
    console.log('Request details:', JSON.stringify(logDetails, null, 4));
    next();
};


/** Check if the incoming request's domain is allowed.
 * @param {Object} req - The Express request object, representing the HTTP request.
 * @param {Object} res - The Express response object, representing the HTTP response.
 * @param {Function} next - The next function in the stack.
 */
const domainCheckMiddleware = (req, res, next) => {
    const host = req.hostname || req.headers.host.split(':')[0];
    if (host=== 'localhost') return next();
	const domainParts = host.split('.');
    if (domainParts.length < 2)  return res.status(403).send('Access Forbidden: Invalid domain.');
    const baseDomain = domainParts.slice(-2).join('.');
    const subDomain = domainParts.length > 2 ? domainParts.slice(0, -2).join('.') : '';
    const isAllowedDomain = allowedDomains.includes(baseDomain);
    const isAllowedSubDomain = allowedSubDomains.includes(subDomain) || !subDomain;
    if (isAllowedDomain && (isAllowedSubDomain || subDomain === '')) return next();
    return res.status(403).send('Access Forbidden: This domain is not allowed.');
};

/** Enforce HTTPS by redirecting HTTP requests.
 * @param {Object} req - Request object.
 * @param {Object} res - Response object.
 * @param {Function} next - Next function.
 */

let foundDomain;
const enforceHttps = (req, res, next) => {
	if(req.hostname === 'localhost') next();
	if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
		const hostname = getBaseDomain(req.hostname);
        if(allowedDomains.includes(hostname)) foundDomain = hostname;
		return next();
	}
	res.redirect('https://' + req.headers.host + req.url);
};

/** Rate limiter to limit the number of requests from a single IP address.
 * - Window: 10 minutes
 * - Maximum requests: 500
 * - Message on exceeding rate limit: 'Too many requests from this IP, please try again later.'
 * @type {Object}
 */
const limiter = rateLimit({
	windowMs: 10 * 60 * 1000,
	max: 500,
	message: 'Too many requests from this IP, please try again later.',
	keyGenerator: (req) => req.ip,
	standardHeaders: true,
	legacyHeaders: false
});

/** Rate limiter for registration requests.
 * Limits each IP to 10 registration requests per hour.
 * @type {Object}
 */
const registerLimiter = rateLimit({
	windowMs: 60 * 60 * 1000,
	max: 10, 
	message: 'Too many registration attempts from this IP, please try again after an hour.',
	keyGenerator: (req) => req.ip,
	handler: (res) => {
		res.status(429).json({
			success: false,
			message: 'Too many login attempts from this IP, please try again after an hour.',
			remainingAttempts: 0
		});
	},
	headers: true
});

/** Rate limiter for phone and email verification attempts.
 * Limits each email or phone number to 6 requests per windowMs.
 * @type {Object}
 */
const verificationLimiter = rateLimit({
	windowMs: 60 * 60 * 1000,
	max: 6,
	message: 'Too many verification attempts from this identifier, please try again after an hour.',
	keyGenerator: (req) => req.body.phone || req.body.email,
	handler: (res) => {
		res.status(429).json({
		  success: false,
		  message: 'Too many verification attempts from this identifier, please try again after an hour.',
		  remainingAttempts: 0
		});
	},
	headers: true
});

/** Rate limiter for login requests.
 * Limits each IP to 25 login requests per hour.
 * @type {Object}
 */
const loginLimiter = rateLimit({
	windowMs: 60 * 60 * 1000,
	max: 25,
	message: 'Too many login attempts from this IP, please try again after an hour.',
	keyGenerator: (req) => req.ip,
	handler: (res) => {
		res.status(429).json({
			success: false,
			message: 'Too many login attempts from this IP, please try again after an hour.',
			remainingAttempts: 0
		});
	},
	headers: true
});

/** Rate limiter for password reset requests.
 * Limits each IP to 5 password reset requests per hour.
 * @type {Object}
 */
const forgotLimiter = rateLimit({
	windowMs: 60 * 60 * 1000,
	max: 5,
	message: 'Too many password reset attempts from this IP, please try again after an hour.',
	keyGenerator: (req) => req.ip,
	handler: (res) => {
		res.status(429).json({
			success: false,
			message: 'Too many login attempts from this IP, please try again after an hour.',
			remainingAttempts: 0
		});
	},
	headers: true
});

/** Rate limiter for all requests.
 * Limits each IP to 5 password reset requests per hour.
 * @type {Object}
 */
const publicLimiter = rateLimit({
	windowMs: 60 * 60 * 1000,
	max: 5,
	message: 'Too many attempts from this IP, please try again after an hour.',
	keyGenerator: (req) => req.ip,
	handler: (res) => {
		res.status(429).json({
			success: false,
			message: 'Too many login attempts from this IP, please try again after an hour.',
			remainingAttempts: 0
		});
	},
	headers: true
});

/** Rate limiter for terms and about.
 * Limits each IP to 50 password reset requests per hour.
 * @type {Object}
 */
const webLimiter = rateLimit({
	windowMs: rateLimitConfig.defaultUser.windowMs,
	max: rateLimitConfig.defaultUser.max,
	keyGenerator: (req) => req.ip,
	handler: (req, res) => {
	  res.status(429).json({
		success: false,
		message: 'Too many attempts from this IP, please try again later.',
		remainingAttempts: 0,
	  });
	},
	headers: true,
	skip: (req) => {
		const userAgent = (req.get('User-Agent') || '').toLowerCase();
		for (const botName in rateLimitConfig.bots) {
			if (userAgent.includes(botName.toLowerCase())) {
				req.rateLimitConfig = rateLimitConfig.bots[botName];
				return false;
			}
		}
		if (userAgent.includes('bot') || userAgent.includes('spider')) {
			req.rateLimitConfig = rateLimitConfig.defaultBot;
			return false;
		}
		req.rateLimitConfig = rateLimitConfig.defaultUser;
		return true;
	},
	max: (req) => req.rateLimitConfig.max,
	windowMs: (req) => req.rateLimitConfig.windowMs,
});

/** Rate limiter for profile view attempts.
 * Limits each userId to 15 profile views per 15-minute window.
 * @type {Object}
 */
const profileViewLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 15,
	message: 'Too many profile view attempts, please try again after 15 minutes.',
	keyGenerator: (req) => req.params.userId,
	handler: (res) => {
		res.status(429).render('error', {
			errorNum: 429,
			errorMessage: 'Too Many Requests',
			errorDescription: 'Too many profile view attempts, please try again after 15 minutes.',
			action: 'Return Home',
			actionLink: '/'
		});
	},
	headers: true,
	skip: (req) => {
		const userAgent = (req.get('User-Agent') || '').toLowerCase();
		for (const botName in rateLimitConfig.bots) {
			if (userAgent.includes(botName.toLowerCase())) {
				req.rateLimitConfig = rateLimitConfig.bots[botName];
				return false;
			}
		}
		if (userAgent.includes('bot') || userAgent.includes('spider')) {
			req.rateLimitConfig = rateLimitConfig.defaultBot;
			return false;
		}
		req.rateLimitConfig = rateLimitConfig.defaultUser;
		return false;
	},
	max: (req) => req.rateLimitConfig.max,
	windowMs: (req) => req.rateLimitConfig.windowMs,
});

/** Rate limiter for profile update attempts.
 * Limits each userId to 6 profile updates per 15-minute window.
 * @type {Object}
 */
const profileUpdateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 6,
	message: 'Too many profile update attempts, please try again after 15 minutes.',
	keyGenerator: (req) => req.params.userId,
	handler: (res) => {
		res.status(429).json({
			success: false,
			message: 'Too many profile update attempts, please try again after 15 minutes.',
			remainingAttempts: 0
		});
	},
	headers: true
});

/** Destroys the user's session and clears the session cookie.
 * @param {Object} req - The HTTP request object. Used to access the session and its data.
 */
const destroySession = (req) => {
	if (req.session && req.cookies['stickpm.sid'])  req.session.destroy(err => {
		res.clearCookie('stickpm.sid');
	});
};

/** Validate the CSRF token for requests.
 * This function ensures that the CSRF token is properly set and matches between the session, cookies, and request body/query.
 * @param {Object} req - The HTTP request object. Contains session, cookies, body, and query parameters.
 * @param {Object} res - The HTTP response object. Used to send error responses if validation fails.
 * @param {Function} next - Callback to continue to the next middleware or route handler.
 */
const csrfValidation = async (req, res, next) => {
    try {
        const user = req.session.user;
        const isGuest = user?.isGuest || true;
        if (!isGuest) {
			const sessionCsrfToken = req.session.csrfToken;
			const cookieCsrfToken = req.cookie['csrfToken'];
            if (!sessionCsrfToken || !cookieCsrfToken) {
                console.error('CSRF token is missing from session or cookie.');
                return res.status(403).render('error', {
                    errorNum: 403,
                    errorMessage: 'CSRF Token Missing',
                    errorDescription: 'CSRF token is missing. Please log in again.',
                    action: 'Return to Home Page',
                    actionLink: '/'
                });
            }
			if (sessionCsrfToken !== cookieCsrfToken) {
				destroySession(req);
                return res.status(403).render('error', {
                    errorNum: 403,
                    errorMessage: 'CSRF Token Mismatch',
                    errorDescription: 'The CSRF token provided does not match the one in your session or cookie. Please try again.',
                    action: 'Return to Home Page',
                    actionLink: '/'
                });
            }
			const requestCsrfToken = req.body?._csrf || req.query?._csrf || false;
            if (requestCsrfToken && requestCsrfToken !== sessionCsrfToken) {
				destroySession(req);
                return res.status(403).render('error', {
                    errorNum: 403,
                    errorMessage: 'CSRF Token Mismatch',
                    errorDescription: 'The CSRF token provided does not match the one in your session or cookie. Please try again.',
                    action: 'Return to Home Page',
                    actionLink: '/'
                });
            }
            const sanitizedUserId = String(user.username).trim().replace(/[^\w]/g, '');
            if (/^[a-zA-Z0-9]+$/.test(sanitizedUserId)) {
                const validUser = findUserByUsername(sanitizedUserId);
                if (!validUser) {
					destroySession(req);
                    return res.status(403).render('error', {
                        errorNum: 403,
                        errorMessage: 'Invalid User Account',
                        errorDescription: `The account ${sanitizedUserId} is invalid. Please contact support if you think this is a mistake.`,
                        action: 'Return to Home Page',
                        actionLink: '/'
                    });
                }
				const updatedUser = updateUserSessionData(user, validUser, sessionCsrfToken);
                req.session.user = updatedUser;
            }
        }
        return next();
    } catch (error) {
        console.error('Error in CSRF validation:', error);
        return res.status(500).render('error', {
            errorNum: 500,
            errorMessage: 'Server Error',
            errorDescription: 'An internal error occurred during CSRF validation. Please try again later.',
            action: 'Return to Home Page',
            actionLink: '/'
        });
    }
};

/** SessionF configuration.
 * - Uses a secure session with HTTP-only cookies.
 * - Regenerates session IDs using the sessionValidation function.
 * @type {Object}
 */
const sessionMiddleware = session({
	secret: process.env.SESSION_SECRET || 'stickpm',
	resave: false,
	saveUninitialized: true,
	cookie: {
		httpOnly: true, //may need to adjust to port 80 with localhost only
		maxAge: 6 * 60 * 60 * 1000,
		sameSite: 'lax',
		secure: true,  //100% need to edit if you arent using https
		domain: '.stickpm.com'
	},
	name: 'stickpm.sid'
});

/** Error handling middleware.
 * @param {Object} err - The error object.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 */
const errorHandlingMiddleware = (err, req, res, next) => {
	res.status(err.status || 500);
	res.render('error', {
		errorNum: err.status || 500,
		errorMessage: err.message || 'Internal Server Error',
		errorDescription: err.description || 'Something went wrong',
		action: 'Return to Home Page',
		actionLink: '/'
	});
};

/** Check if the user is authenticated.
 * It also ensures that non-guest users have a valid CSRF token.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function in the stack.
 */
const isAuthenticated = (req, res, next) => {
	const isGuest = req.session?.user?.isGuest === true;
	const isLogged = req.session?.user && (!isGuest && req.session.csrfToken);
	if (isLogged && !req.session.csrfToken) {
		return res.status(403).render('error', {
			errorNum: 403,
			errorMessage: 'Access Denied',
			errorDescription: 'You need to log in to access this page.',
			action: 'Return to Home Page',
			actionLink: `/`
		});
	}
	if (req.session?.user) return next();
	return res.status(403).render('error', {
		errorNum: 403,
		errorMessage: 'Access Denied',
		errorDescription: 'You need to log in to access this page.',
		action: 'Return to Login Page',
		actionLink: `/?type=login`
	});
};

/** Check if the user has the required role.
 * @param {string} role - The required role.
 */
const hasRole = (role) => { //validate user has role in database.js
	const roleHierarchy = {
		'guest': 1,
		'member': 2,
		'moderator': 3,
		'admin': 4,
		'super': 5,
		'owner': 6,
		'developer': 7
	};
	return async (req, res, next) => {
		try {
			const username = req.session.user?.username;
			if (!username) return res.status(401).send('User not authenticated');
			const user = findUserByUsername(username);
			if (!user) return res.status(404).send('User not found');
			const roomId = req.params.roomId || req.body.roomId;
			if (!roomId) return res.status(400).send('Room ID is required');
			const userRole = await checkRole(roomId, user);
			if (userRole && roleHierarchy[userRole] >= roleHierarchy[role]) {
				return next();
			} else {
				return res.status(403).send('Access denied. Insufficient permissions.');
			}
		} catch (error) {
			return res.status(500).send('Internal server error');
		}
	};
};

/** Require a specific subdomain.
 * @param {string} subdomain - The required subdomain name to check for.
 * @returns {Function} - Returns an Express middleware function.
 */
const requireSubdomain = (subdomain) => {
    return function (req, res, next) {
		const subdomains = req.subdomains;
		if (req.hostname === 'localhost' || req.hostname === '127.0.0.1' && subdomains === 'chat') return next();
		const isAllowedSubdomain = subdomains && subdomains.some(subdomain => allowedSubDomains.includes(subdomain));
		if (isAllowedSubdomain) return next();
		else return next('route');
    };
};

/** Skip subdomains.
* @returns {Function} - Returns an Express middleware function.
*/
const skipSubDomain = () => {
	return function (req, res, next) {
		const subdomains = req.subdomains;
		const isSubdomain = subdomains && subdomains.some(subdomain => allowedSubDomains.includes(subdomain));
		if (isSubdomain) return next('route');
		else return next();
	};
};

/** Extract the base domain from the hostname.
 * @param {string} hostname - The hostname from the request.
 * @param {boolean} sub - If true, return the subdomain part.
 * @returns {string} - The base domain or subdomain (e.g., 'chathobby.com' or 'profile').
 */
const getBaseDomain = (hostName, sub = false) => {
    const splitName = hostName.split(':')[0];
    const parts = splitName.split('.');
    const len = parts.length;
    if (sub) {
		if (len > 2) return parts.slice(0, len - 2).join('.');
		return '';
	}
	else {
        if (len >= 2) return parts.slice(len - 2).join('.');
        return hostName;
    }
};

/* In-memory session tracking */
const sessionMemory = new Map();

/** Apply middlewares to the Express app.
 * @param {Object} app - The Express app instance.
 */
const applyMiddlewares = (app) => {
	app.use(cookieParser());
	app.use(compression());
	app.use(morgan('dev'));
	app.use(xss());
	app.use(hpp());
	app.use(sanitizeInputs);
	app.use(helmet());
	app.use(customRequestBlocker);
	app.use(errorHandlingMiddleware);
	app.set('trust proxy', 1);
	app.use(limiter);
	app.use(helmet.contentSecurityPolicy({
		directives: {
			defaultSrc: ["'self'"],
			scriptSrc: ["'self'", "'unsafe-inline'"], // will make safe inline later
			styleSrc: ["'self'", 'https:', "'unsafe-inline'"], //will make safe inline later
			imgSrc: ["'self'", 'data:', 'https:'],
			connectSrc: ["'self'", 'wss:'],
			fontSrc: ["'self'", 'https:'],
			objectSrc: ["'none'"],
			mediaSrc: ["'self'"],
			frameSrc: ["'self'"]
		}
	}));
	app.use(enforceHttps);
	app.use(logRequestDetails);
	app.use(sessionMiddleware);
	/*app.use((req, res, next) => {
		const userAgent = req.headers['user-agent']?.toLowerCase() || '';
		const hostname = req.hostname;
		const baseDomain = getBaseDomain(hostname);
		const isBot = botList().some(bot => userAgent.includes(bot));
		const isQueryRequest = req.query && Object.keys(req.query).length > 0;
		if (req.session && req.session.cookie) {
			if (baseDomain === 'stickpm.com' || baseDomain === 'chathobby.com') req.session.cookie.domain = `.${baseDomain}`;
		}
		if (isBot || isQueryRequest) return next();
		if (!req.session.user) {
			QPRx2025.init(Math.floor(Math.random() * 1e6));
			const guestNickname = `Guest_${QPRx2025.generateCharacters(6)}`;
			req.session.user = {
				username: guestNickname,
				role: 'guest',
				isGuest: true,
				roomsAccess: { "Lobby": true },
			};
		}
		next();
	});*/
	app.use((req, res, next) => {
		const userAgent = req.headers['user-agent']?.toLowerCase() || '';
		const acceptLang = req.headers['accept-language'] || '';
		const connectionType = req.headers['connection'] || '';
		const dnt = req.headers['dnt'] || '';
		const hostname = req.hostname;
		const baseDomain = getBaseDomain(hostname);
		const isBot = botList().some(bot => userAgent.includes(bot));
		const isQueryRequest = req.query && Object.keys(req.query).length > 0;
		const currentGeo = geoip.lookup(req.ip) || {};
		const clientSignature = `${userAgent}_${acceptLang}_${connectionType}_${dnt}`;
		if (req.session && req.session.cookie) {
			if (baseDomain === 'stickpm.com' || baseDomain === 'chathobby.com') req.session.cookie.domain = `.${baseDomain}`;
			else if (req.session.cookie.domain && (hostname === 'localhost' || hostname === '127.0.0.1')) req.session.cookie.domain = `.${baseDomain}`;
		}
		let sessionData = sessionMemory.get(clientSignature);
		if (isBot || isQueryRequest) return next();
		if (sessionData) {
			const { lastGeo, timestamp } = sessionData;
			const timeDiff = Date.now() - timestamp;
			if (lastGeo.city === currentGeo.city && lastGeo.region === currentGeo.region && timeDiff < 30 * 60 * 1000) {
				req.session = sessionData.session;
				return next();
			}
		}
		if (!req.session.user) {
			QPRx2025.init(Math.floor(Math.random() * 1e6));
			const guestNickname = `Guest_${QPRx2025.generateCharacters(6)}`;
			req.session.user = {
				username: guestNickname,
				role: 'guest',
				isGuest: true,
				roomsAccess: { "Lobby": true },
			};
		}
		sessionMemory.set(clientSignature, {
			session: req.session,
			lastGeo: currentGeo,
			timestamp: Date.now(),
		});
		next();
	});
	app.use(csrfValidation);
	app.use(upload.none());
};

module.exports = {
	domainCheckMiddleware,
	profileUpdateLimiter,
	verificationLimiter,
	handleTypeOfPayment,
	profileViewLimiter,
	sessionMiddleware,
	applyMiddlewares,
	requireSubdomain,
	registerLimiter,
	isAuthenticated,
	skipSubDomain,
	getBaseDomain,
	forgotLimiter,
	publicLimiter,
	loginLimiter,
	webLimiter,
	hasRole
};