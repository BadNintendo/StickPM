/*  ██╗██╗                                                                                           ██╗██╗
 *  ██║╚═╝  ███████╗████████╗██╗ ██████╗██╗  ██╗██████╗ ███╗   ███╗     ██████╗ ██████╗ ███╗   ███╗  ╚═╝██║
 *  ██║     ██╔════╝╚══██╔══╝██║██╔════╝██║ ██╔╝██╔══██╗████╗ ████║    ██╔════╝██╔═══██╗████╗ ████║     ██║
 *  ██║     ███████╗   ██║   ██║██║     █████╔╝ ██████╔╝██╔████╔██║    ██║     ██║   ██║██╔████╔██║     ██║
 *  ██║     ╚════██║   ██║   ██║██║     ██╔═██╗ ██╔═══╝ ██║╚██╔╝██║    ██║     ██║   ██║██║╚██╔╝██║     ██║
 *  ██║     ███████║   ██║   ██║╚██████╗██║  ██╗██║     ██║ ╚═╝ ██║ ██╗╚██████╗╚██████╔╝██║ ╚═╝ ██║     ██║
 *  ██║██╗  ╚══════╝   ╚═╝   ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝     ╚═╝ ╚═╝ ╚═════╝ ╚═════╝ ╚═╝     ╚═╝  ██╗██║
 *  ╚═╝╚═╝                                                                                           ╚═╝╚═╝
 * StickPM Project
 * © 2024 BadNintendo - Custom Routes Module
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
 * This module defines the various HTTP routes for handling requests in 
 * the StickPM application. It includes routes for user management, room 
 * management, messaging, streaming, polls, file sharing, and more. 
 * Additionally, it handles user registration, login, account verification, 
 * password reset, and rate limiting for security purposes.
 * 
 * Need To-Do:
 * 1. Game Section need to make an object array for games and not use this method of isSpectator lols
 * 2. test SMS register looks like needs a json reply not render like it has
 * 3. turn maintenance into a ssh acceptable value
 * 4. Correct index.ejs form valition highlights
 */

const express = require('express');
const router = express.Router();
const QPRx2025 = require('./QPRx2025');

const {
	validationResult
} = require('express-validator');

const {
	findUserByEmailOrPhone,
	getArchivedMessages,
	findUserByUsername,
	updateUserProfile,
	verifyUserAccount,
	cleanProfileData,
	verifyPhoneCode,
	verifyEmailToken,
	unmuteUserInRoom,
	muteUserInRoom,
	checkOwnedRoom,
	unfollowStream,
	shadowBanUser,
	resetPassword,
	findUserById,
	setRoomTopic,
	suspendUser,
	returnRooms,
	createRoom,
	deleteRoom,
	createClip,
	disable2FA,
	checkUsers,
	checkRoom,
	enable2FA,
	fetchRoomData,
	lockRoom,
	shareFile,
	addUser,
	cache,
	isVip,
	addReaction,
	followStream,
	cleanUserData,
	unlockRoom,
	generateToken,
	deleteUser,
	votePoll,
	createPoll,
	rewardRandomActiveUser,
} = require('./database');

const {
	sendPhoneVerificationCode,
	resetPasswordValidation,
	sendPasswordResetEmail,
	setRoomTopicValidation,
	registrationValidation,
	confirmPhoneValidation,
	sendConfirmationEmail,
	confirmProfileUpdate,
	createRoomValidation,
	validatePhoneNumber,
	shareFileValidation,
	resettingPassword,
	validateRoomName,
	analyzeSentiment,
	sendJsonResponse,
	forgotValidation,
	loginValidation,
	indexValidation,
	maskPhoneNumber,
	confirmingEmail,
	roomValidation,
	confirmProfile,
	validateEmail,
	maskEmail,
	logError
} = require('./misc');

const {
	profileUpdateLimiter,
	verificationLimiter,
	profileViewLimiter,
	requireSubdomain,
	registerLimiter,
	isAuthenticated,
	getBaseDomain,
	forgotLimiter,
	publicLimiter,
	skipSubDomain,
	loginLimiter,
	webLimiter,
	hasRole
} = require('./middleware');

const {
	getHeadData
} = require('./head');

/** Server Maintenance for Chatroom Page to show while debugging */
const maintenance = false;

/** GET home page. - Renders the home page with the specified form based on query parameters.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.get('/', indexValidation(), skipSubDomain('index'), (req, res) => {
	const { type = '', userId = '', token = '' } = req.query;
	if (type && !['login', 'register', 'forgot', 'verify-phone', 'reset-password', 'logout'].includes(type)) {
		return res.status(400).render('error', {
			errorNum: 400,
			errorMessage: 'Bad Request',
			errorDescription: 'Invalid type parameter',
			action: 'Refresh here',
			actionLink: '/'
		});
	}
	let csrfToken;
	const isGuest = req.session?.user?.isGuest === true;
	const isLogged = req.session?.user && (!isGuest && req.session.csrfToken);
	if (isLogged && !req.session.csrfToken) {
		return res.status(403).render('error', {
			errorNum: 403,
			errorMessage: 'CSRF Token Invalid',
			errorDescription: 'The CSRF token provided is invalid or missing. Please refresh the page and try again.',
			action: 'Refresh Here',
			actionLink: '/'
		});
	} else if (isLogged) csrfToken = req.session.csrfToken;
	const domain = getBaseDomain(req.hostname);
	const headData = getHeadData('index', { domain });
	res.render('index', { title: 'StickPM', type, userId, token, isLogged, csrfToken, headData, data: req.user });
});

/** GET list of rooms. - Retrieves a list of all rooms in the database.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.get(['/:sortBy?', '/chat/:sortBy?'], requireSubdomain('chat'), (req, res, next) => { 
    let rooms;
	if (cache.rooms && (Date.now() - cache.roomsTimestamp < 5 * 60 * 1000))  rooms = cache.rooms;
	else {
		rooms = cache.rooms = returnRooms();
		cache.roomsTimestamp = new Date();
	}
	const sortBy = req.params.sortBy;
    const validSortOptions = ['reverse', 'name', 'users', 'cap', 'locked', 'protected', 'guest'];
    const isSortValid = validSortOptions.includes(sortBy);
	const sortFunctions = {
        reverse: (a, b) => b.name.localeCompare(a.name, 'en', { numeric: true }),
        name: (a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }),
        users: (a, b) => b.users.length - a.users.length,
        cap: (a, b) => b.streamsLimit - a.streamsLimit,
        locked: (a, b) => b.locked - a.locked,
        protected: (a, b) => b.contentProtection - a.contentProtection,
        guest: (a, b) => b.allowGuests - a.allowGuests
    };
    if (isSortValid || !sortBy && !isSortValid) {
		rooms = Object.values(rooms).sort(sortFunctions[sortBy]);
		res.json(rooms);
	} else return next('route');
	/* if (loggedInUser) profiles = profiles.filter(profile => !loggedInUser.blocked.includes(profile.id)); */
	/*res.render('roomCards', {
		rooms: rooms,
		headData,
		isLogged: true
	});*/
});

/** GET specific room page. - Renders the chat page for a specific room if the user has access.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.get(['/:roomId', '/chat/:roomId'], requireSubdomain('chat'), async (req, res) => {
    const { roomId } = req.params;
	if (!validateRoomName(roomId)) {
		return res.status(404).render('error', {
			errorNum: 404,
			errorMessage: 'Invalid Room ID',
			errorDescription: `Room ID ${roomId} must be between 3 and 35 characters long.`,
			action: 'Return to Home Page',
			actionLink: '/'
		});
	}
	const room = checkRoom(roomId);
	if (!room) {
		return res.status(404).render('error', {
			errorNum: 404,
			errorMessage: 'Room Not Found',
			errorDescription: `Room ${roomId} does not exist.`,
			action: 'Return to Home Page',
			actionLink: '/'
		});
	}
	const isRoomLocked = req.session?.user?.role !== 'developer' ? true : false;
	if (!req.session.user?.isGuest) {
		if (!room.allowGuests) {
			return res.status(403).render('error', {
				errorNum: 403,
				errorMessage: 'Guest Access Not Allowed',
				errorDescription: 'Guest access is not allowed for this room',
				action: 'Login Here',
				actionLink: '/?type=login'
			});
		}
	} else if (room.locked && !req.session.user.roomsAccess[roomId] && isRoomLocked) {
		return res.render('locked', { roomId });
	} else if (!req.session.user.isGuest && !req.session.csrfToken) {
		return res.status(403).render('error', {
			errorNum: 403,
			errorMessage: 'CSRF Token Invalid',
			errorDescription: 'The CSRF token provided is invalid or missing. Please login again.',
			action: 'Refresh Here',
			actionLink: `/`
		});
	}
	const vipStatus = await isVip({ room }, req);
	Object.assign(room, vipStatus);
	const messages = getArchivedMessages(roomId);
	const serverMaintenance = maintenance ? req.session?.user?.role !== 'developer' : false;
	const domain = getBaseDomain(req.hostname);
	const subDomain = getBaseDomain(req.hostname, true);
	const headData = getHeadData('chat', { domain, subDomain }, {} , room);
	res.render('chat', {
		title: 'StickPM - ',
		room,
		user: cleanUserData(req.session.user), // do a extra clean on privcy true profiles
		messages: messages,
		maintenance: serverMaintenance,
		headData
	});
});






/** POST to lock a room. - Locks a specific room by ID.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post(['/:roomId/lock', '/chat/:roomId/lock'], isAuthenticated, hasRole('admin'), requireSubdomain('chat'), async (req, res) => {
    try {
		const { roomId } = req.params;
        if (!validateRoomName(roomId)) {
            return sendJsonResponse(res, 404, 'error', 'Invalid Room ID', {
                errorDescription: `Room ID ${roomId} must be between 3 and 35 characters long.`
            });
        }
        await lockRoom(roomId, req.session.user.id);
        sendJsonResponse(res, 200, 'success', 'Room locked', { roomId });
    } catch (error) {
        logError(error, { context: 'Lock Room' });
        sendJsonResponse(res, 400, 'error', error.message);
    }
});

/** POST to unlock a room. - Unlocks a specific room by ID.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post(['/:roomId/unlock', '/chat/:roomId/unlock'], isAuthenticated, hasRole('admin'), requireSubdomain('chat'), async (req, res) => {
    try {
		const { roomId } = req.params;
        if (!validateRoomName(roomId)) {
            return sendJsonResponse(res, 404, 'error', 'Invalid Room ID', {
                errorDescription: `Room ID ${roomId} must be between 3 and 35 characters long.`
            });
        }
        await unlockRoom(roomId, req.session.user.id);
        sendJsonResponse(res, 200, 'success', 'Room unlocked', { roomId });
    } catch (error) {
        logError(error, { context: 'Unlock Room' });
        sendJsonResponse(res, 400, 'error', error.message);
    }
});

/** POST to unlock a locked room using a password. - Unlocks a room if the provided password is correct.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post(['/:roomId/unlock-with-password', '/chat/:roomId/unlock-with-password'], isAuthenticated, hasRole('admin'), requireSubdomain('chat'), async (req, res) => {
    const { roomId } = req.params;
    const { password } = req.body;
    if (!validateRoomName(roomId)) {
        return sendJsonResponse(res, 404, 'error', 'Invalid Room ID', {
            errorDescription: `Room ID ${roomId} must be between 3 and 35 characters long.`
        });
    }
    const room = checkRoom(roomId);
    if (room && room.password === password) {
        req.session.user.roomsAccess = req.session.user.roomsAccess || {};
        req.session.user.roomsAccess[roomId] = true;
        const url = getBaseDomain(req.hostname);
        return res.redirect(`//chat.${url}/${roomId}`);
    } else {
        return res.status(403).json({
            status: 'error',
            message: 'Incorrect password. Please try again.'
        });
    }
});

/** POST to register a new user. - Creates a new user if the provided email or phone is valid, the data is correct, and the terms are accepted.
 * @param {Object} req - The request object containing the registration data.
 * @param {Object} req.body - The body of the request.
 * @param {string} req.body.username - The username of the new user.
 * @param {string} req.body.password - The password of the new user.
 * @param {string} req.body.email - The email address of the new user.
 * @param {string} req.body.phone - The phone number of the new user.
 * @param {string} req.body.firstName - The first name of the new user.
 * @param {string} req.body.lastName - The last name of the new user.
 * @param {string} req.body.profilePhoto - The profile photo URL of the new user.
 * @param {boolean} req.body.terms - Agreement to terms and conditions.
 * @param {string} captcha - The captcha entered by the user.
 */
router.post('/register', registrationValidation(), registerLimiter, verificationLimiter, async (req, res) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
		const { username, password, email, phone, firstName, lastName, profilePhoto, private } = req.body;
		if (!email && !phone) throw new Error('Either email or phone must be provided.');
		const token = QPRx2025.generateCharacters(16);
		const sixDigit = Math.floor(100000 + QPRx2025.QuantumPollsRelay(900000));
		const user = await addUser(username, password, email, phone, firstName, lastName, profilePhoto || null, private === 'on' ? false : true, phone ? sixDigit : token);
		if (email) {
			await sendConfirmationEmail(user, token);
			return res.status(201).json({ success: true, message: 'Registration successful. Please check your email to verify your account.' });
		} else if (phone) {
			await sendPhoneVerificationCode(user, sixDigit);
			res.render('index', { title: 'StickPM', type: 'verify-phone', userId: user.id }); //probably wrong
		}
	} catch (error) {
		logError(error, { context: 'Register User' });
		res.status(400).json({ success: false, message: error.message });
	}
});

/** POST to login a user. - Authenticates a user using either their username, email, or phone number and creates a session if the credentials are valid.
 * @param {string} identifier - The username, email, or phone number of the user.
 * @param {string} password - The password of the user.
 * @param {boolean} rememberme - Indicates if the session should be remembered.
 * @param {string} captcha - The captcha entered by the user.
 */
router.post('/login', loginValidation(), loginLimiter, async (req, res) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
		const { rememberme } = req.body;
		const user = req.user;
		if (!user) return res.status(500).json({ success: false, message: `Invalid Username, Email, or Phone number. Remaining Attempts ${req.rateLimit.remaining}` });
		if (user.twoFactorEnabled) {
			if (!user.code) {
				const code = user.code = Math.floor(100000 + QPRx2025.QuantumPollsRelay(900000));
				if (user.typeOf === 'email' && user.email || user.email) await sendConfirmationEmail(user, code);
				else if (user.typeOf === 'phone' && user.phone || user.phone) await sendPhoneVerificationCode(user, code);
				return res.status(500).json({ success: 'waiting', message: `2FA Enabled on Account, Check your ${(user.email) ? `email: ${maskEmail(user.email)}` : `phone: ${maskPhoneNumber(user.phone)}`}.` });
			} else if (user.code && code) {
				if (user.code && user.code !== code) return res.status(404).json({ success: 'waiting', message: `Invalid 2FA verification code. Attempts left: ${req.rateLimit.remaining}` });
			}
		}
		req.session.regenerate((err) => {
			if (err) {
				logError(err, { context: 'Session Regeneration' });
				return res.status(500).json({ success: false, message: `Failed to create session. Please try again. Remaining Attempts ${req.rateLimit.remaining}` });
			}
			req.session.user = cleanUserData(user);
			const sessionMaxAge = req.session.cookie.maxAge = (rememberme && !user.twoFactorEnabled) ? 30 * 24 * 60 * 60 * 1000 : 6 * 60 * 60 * 1000;
			QPRx2025.init(new Date());
			const token = QPRx2025.generateCharacters(24);
			req.session.csrfToken = token;
			req.session.save(err => {
                if (err) {
                    logError(err, { context: 'Session Save' });
                    return res.status(500).json({ success: false, message: 'Failed to save session.' });
                }
                if (rememberme) res.cookie('csrfToken', token, { httpOnly: true, secure: true, sameSite: 'Strict', maxAge: sessionMaxAge });
                console.log(`User ${user.username} logged in successfully.`);
                res.json({ success: true, message: 'Logged in successfully.', username: user.username });
            });
		});
	} catch (error) {
		logError(error, { context: 'Login User' });
		res.status(500).json({ success: false, message: `An internal server error occurred. Please try again later. Remaining Attempts ${req.rateLimit.remaining}` });
	}
});

/**  Serve the CAPTCHA as an SVG image.
 * @route GET /captcha.svg
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.get('/captcha.svg', (req, res) => {
	QPRx2025.init(Math.floor(Math.random() * 1000000));
	let captcha = QPRx2025.generateCharacters(5);
	req.session.captcha = captcha;
    const namespace = 'http://www.w3.org/2000/svg';
    let svgCaptcha = `<svg xmlns="${namespace}" width="150" height="50">`; //width='100%" if any issues"
	const getRandomColor = () => {
        const letters = '89ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * letters.length)];
        }
        return color;
    };
    const getRandomInt = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    captcha.split('').forEach((char, index) => {
        const x = 20 * index + 10;
        const y = 35;
        const color = getRandomColor();
        const rotation = getRandomInt(-20, 20);
        svgCaptcha += `<text x="${x}" y="${y}" font-size="30" font-family="Verdana, sans-serif" fill="${color}" transform="rotate(${rotation}, ${x}, ${y})">${char}</text>`;
    });
    for (let i = 0; i < 15; i++) {
        const cx = getRandomInt(0, 150);
        const cy = getRandomInt(0, 50);
        const radius = getRandomInt(1, 3);
        const color = getRandomColor();
        svgCaptcha += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${color}" />`;
    }
    svgCaptcha += '</svg>';
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svgCaptcha);
});
	
/** POST to handle forgotten info. - Sends an email or SMS to the user with recovery information.
 * @param {string} identifier2 - The email or phone number of the user.
 */
router.post('/forgot', forgotLimiter, forgotValidation(), async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
	const { identifier2 } = req.body;
	try {
		const user = await findUserByEmailOrPhone(identifier2);
		if (user) {
			const token = generateToken();
			await updateUserProfile(user.id, { code: token });
			if (validateEmail(identifier2)) await sendPasswordResetEmail(user, token);
			else if (validatePhoneNumber(identifier2)) await sendPhoneVerificationCode(user, token);
			res.status(200).json({ success: true, message: `Recovery information sent.` });
		} else {
			logError('User not found', { context: 'Forgot Password' });
			res.status(404).json({ success: false, message: `Invalid recovery information. Remaining Attempts ${req.rateLimit.remaining}` });
		}
	} catch (error) {
		logError(error, { context: 'Forgot Password' });
		res.status(500).json({ success: false, message: `${error.message}. Remaining Attempts ${req.rateLimit.remaining}` });
	}
});

/** POST to confirm phone number. - Verifies the phone number using the code.
 * @param {string} userId - The user ID.
 * @param {string} code - The phone verification code.
 */
router.post('/confirm-phone', publicLimiter, confirmPhoneValidation(), async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
	const { userId, code } = req.body;
	try {
		await verifyPhoneCode(userId, code);
		res.status(200).send(`Phone number confirmed. Your account has been created. You can now close this window and proceed to login.`);
	} catch (error) {
		logError(error, { context: 'Confirm Phone' });
		res.status(400).send(error.message);
	}
});

/** POST to reset password. - Resets the password using the token.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post('/reset-password', publicLimiter, resetPasswordValidation(), async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
	const { token, password } = req.body;
	try {
		const hashedPassword = QPRx2025.customHash(password, process.env.HASHUSERSALT || 10);
		await resetPassword(token, hashedPassword);
		res.status(200).send(`Password reset successful. You can now close this window and log in. Remaining Attempts ${req.rateLimit.remaining}`);
	} catch (error) {
		logError(error, { context: 'Reset Password' });
		res.status(400).send(error.message);
	}
});

/** GET/POST to logout a user. - Logs out the current user and destroys the session.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const logoutHandler = (req, res) => {
	req.session.destroy((err) => {
		if (err) {
			logError(err, { context: 'Logout User' });
			res.status(500).send('Logout failed');
		} else {
			res.redirect('/'); //res.sendStatus(200);
		}
	});
};
router.get('/logout', isAuthenticated, logoutHandler);
router.post('/logout', isAuthenticated, logoutHandler);

/** GET to confirm email.
 * @param {string} token - The email confirmation token.
 */
router.get('/confirm-email', publicLimiter, confirmingEmail(), async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
	const { token } = req.query;
	try {
		await verifyEmailToken(token);
		res.status(200).send(`Email confirmed. You can now close this window and log in. Remaining Attempts ${req.rateLimit.remaining}`);
	} catch (error) {
		logError(error, { context: 'Confirm Email' });
		res.status(400).send(error.message);
	}
});

/** GET to reset password.
 * @param {string} token - The password reset token.
 */
router.get('/reset-password', publicLimiter, resettingPassword(), (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
	const { token } = req.query;
	res.render('index', { title: 'StickPM', type: 'reset-password', token });
});

/** POST to create a new room. - Creates a new room with the provided name.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post('/createRoom', isAuthenticated, hasRole('member'), createRoomValidation, async (req, res) => {
    const { roomName, settings } = req.body;
    try {
        if (!validateRoomName(roomName)) {
            return sendJsonResponse(res, 404, 'error', 'Invalid Room ID', {
                errorDescription: `Room ID ${roomName} must be between 3 and 35 characters long.`
            });
        }
        const roomId = await createRoom(roomName, settings, req.session.user.id);
        return sendJsonResponse(res, 201, 'success', 'Room created', { roomId, roomName });
    } catch (error) {
        logError(error, { context: 'Create Room' });
        return sendJsonResponse(res, 400, 'error', error.message);
    }
});

/** DELETE to delete a room. - Deletes a specific room by ID. -* @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.delete(['/deleteRoom/:roomId', '/chat/deleteRoom/:roomId'], isAuthenticated, hasRole('owner'), roomValidation, requireSubdomain('chat'), async (req, res) => {
    try {
		const { roomId } = req.params;
        if (!validateRoomName(roomId)) {
            return sendJsonResponse(res, 404, 'error', 'Invalid Room ID', {
                errorDescription: `Room ID ${roomId} must be between 3 and 35 characters long.`
            });
        }
        await deleteRoom(roomId, req.session.user.id);
        return sendJsonResponse(res, 200, 'success', 'Room deleted');
    } catch (error) {
        logError(error, { context: 'Delete Room' });
        return sendJsonResponse(res, 400, 'error', error.message);
    }
});

/** POST to set a room topic. - Sets a new topic for a specific room.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post('/setRoomTopic/:roomId', isAuthenticated, hasRole('admin'), setRoomTopicValidation, requireSubdomain('chat'), async (req, res) => {
    const { topic } = req.body;
    try {
		const { roomId } = req.params;
        if (!validateRoomName(roomId)) {
            return sendJsonResponse(res, 404, 'error', 'Invalid Room ID', {
                errorDescription: `Room ID ${roomId} must be between 3 and 35 characters long.`
            });
        }
        await setRoomTopic(roomId, topic, req.session.user.id);
        return sendJsonResponse(res, 200, 'success', 'Room topic updated');
    } catch (error) {
        logError(error, { context: 'Set Room Topic' });
        return sendJsonResponse(res, 400, 'error', error.message);
    }
});

/** POST to share a file in a room. - Shares a file in a specific room.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post(['/shareFile/:roomId', '/chat/shareFile/:roomId'], isAuthenticated, shareFileValidation, requireSubdomain('chat'), async (req, res) => {
    const { file } = req.body;
    try {
		const { roomId } = req.params;
        if (!validateRoomName(roomId)) {
            return sendJsonResponse(res, 404, 'error', 'Invalid Room ID', {
                errorDescription: `Room ID ${roomId} must be between 3 and 35 characters long.`
            });
        }
        await shareFile(roomId, file);
        return sendJsonResponse(res, 200, 'success', 'File shared');
    } catch (error) {
        logError(error, { context: 'Share File' });
        return sendJsonResponse(res, 400, 'error', error.message);
    }
});

/** POST to follow a stream. - Follows a specific stream.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post('/followStream', isAuthenticated, requireSubdomain('chat'), async (req, res) => {
    const { streamId, roomId } = req.body;
    if (!validateRoomName(roomId)) {
        return sendJsonResponse(res, 404, 'error', 'Invalid Room ID', {
            errorDescription: `Room ID ${roomId} must be between 3 and 35 characters long.`
        });
    }
    try {
        await followStream(req.session.user.id, streamId, roomId);
        return sendJsonResponse(res, 200, 'success', 'Stream followed');
    } catch (error) {
        logError(error, { context: 'Follow Stream' });
        return sendJsonResponse(res, 400, 'error', error.message);
    }
});

/** POST to unfollow a stream. - Unfollows a specific stream.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post('/unfollowStream', isAuthenticated, requireSubdomain('chat'), async (req, res) => {
    const { streamId, roomId } = req.body;
    if (!validateRoomName(roomId)) {
        return sendJsonResponse(res, 404, 'error', 'Invalid Room ID', {
            errorDescription: `Room ID ${roomId} must be between 3 and 35 characters long.`
        });
    }
    try {
        await unfollowStream(req.session.user.id, streamId, roomId);
        return sendJsonResponse(res, 200, 'success', 'Stream unfollowed');
    } catch (error) {
        logError(error, { context: 'Unfollow Stream' });
        return sendJsonResponse(res, 400, 'error', error.message);
    }
});

/** POST to enable 2FA for a user. - Enables two-factor authentication for a specific user.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post('/enable2FA', isAuthenticated, requireSubdomain('chat'), async (req, res) => {
    const { userId } = req.body;
    if (userId !== req.session.user.id) return sendJsonResponse(res, 403, 'error', 'Access denied. Please log in.');
    try {
        await enable2FA(userId);
        return sendJsonResponse(res, 200, 'success', '2FA enabled');
    } catch (error) {
        logError(error, { context: 'Enable 2FA' });
        return sendJsonResponse(res, 400, 'error', error.message);
    }
});

/** POST to disable 2FA for a user. - Disables two-factor authentication for a specific user.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post('/disable2FA', isAuthenticated, requireSubdomain('chat'), async (req, res) => {
    const { userId } = req.body;
    if (userId !== req.session.user.id) return sendJsonResponse(res, 403, 'error', 'Access denied. Please log in.');
    try {
        await disable2FA(userId);
        return sendJsonResponse(res, 200, 'success', '2FA disabled');
    } catch (error) {
        logError(error, { context: 'Disable 2FA' });
        return sendJsonResponse(res, 400, 'error', error.message);
    }
});

/** POST to mute a user in a room. - Mutes a specific user in a specific room.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post(['/muteUser/:roomId', '/chat/muteUser/:roomId'], isAuthenticated, hasRole('moderator'), requireSubdomain('chat'), async (req, res) => {
	const { userId } = req.body;
	try {
		const { roomId } = req.params;
		if (!validateRoomName(roomId)) {
			return sendJsonResponse(res, 404, 'error', 'Invalid Room ID', {
				errorDescription: `Room ID ${roomId} must be between 3 and 35 characters long.`,
				action: 'Return to Home Page',
				actionLink: '/'
			});
		}
		await muteUserInRoom(roomId, userId, req.session.user.id);
		sendJsonResponse(res, 200, 'success', 'User muted');
	} catch (error) {
		logError(error, { context: 'Mute User' });
		sendJsonResponse(res, 400, 'error', error.message);
	}
});

/** POST to unmute a user in a room. - Unmutes a specific user in a specific room.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post(['/unmuteUser/:roomId', '/chat/unmuteUser/:roomId'], isAuthenticated, hasRole('moderator'), requireSubdomain('chat'), async (req, res) => {
	const { userId } = req.body;
	try {
		const { roomId } = req.params;
		if (!validateRoomName(roomId)) {
			return sendJsonResponse(res, 404, 'error', 'Invalid Room ID', {
				errorDescription: `Room ID ${roomId} must be between 3 and 35 characters long.`,
				action: 'Return to Home Page',
				actionLink: '/'
			});
		}
		await unmuteUserInRoom(roomId, userId, req.session.user.id);
		sendJsonResponse(res, 200, 'success', 'User unmuted');
	} catch (error) {
		logError(error, { context: 'Unmute User' });
		sendJsonResponse(res, 400, 'error', error.message);
	}
});

/** POST to suspend a user. - Suspends a specific user.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post('/suspendUser', isAuthenticated, hasRole('developer'), requireSubdomain('chat'), async (req, res) => {
	const { userId } = req.body;
	try {
		await suspendUser(userId, req.session.user.id);
		sendJsonResponse(res, 200, 'success', 'User suspended');
	} catch (error) {
		logError(error, { context: 'Suspend User' });
		sendJsonResponse(res, 400, 'error', error.message);
	}
});

/** POST to shadow ban a user. - Shadow bans a specific user.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post('/shadowBanUser', isAuthenticated, hasRole('admin'), requireSubdomain('chat'), async (req, res) => {
	const { userId } = req.body;
	try {
		await shadowBanUser(userId, req.session.user.id);
		sendJsonResponse(res, 200, 'success', 'User shadow banned');
	} catch (error) {
		logError(error, { context: 'Shadow Ban User' });
		sendJsonResponse(res, 400, 'error', error.message);
	}
});

/** POST to add a reaction to a message. - Adds a reaction to a specific message.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post('/reactToMessage', isAuthenticated, requireSubdomain('chat'), async (req, res) => {
	const { messageId, emoji } = req.body;
	try {
		await addReaction(messageId, emoji);
		sendJsonResponse(res, 200, 'success', 'Reaction added');
	} catch (error) {
		logError(error, { context: 'React to Message' });
		sendJsonResponse(res, 400, 'error', error.message);
	}
});

/** POST to invite a user to a room. - Invites a specific user to a specific room.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post('/inviteUser', isAuthenticated, requireSubdomain('chat'), async (req, res) => {
    const { userId, roomId } = req.body;
    try {
        if (!validateRoomName(roomId)) {
            return sendJsonResponse(res, 404, 'error', 'Invalid Room ID', {
                errorDescription: `Room ID ${roomId} must be between 3 and 35 characters long.`
            });
        }
        await handleUserInvite(req.session.user.id, userId, roomId);
        return sendJsonResponse(res, 200, 'success', 'User invited', { userId, roomId });
    } catch (error) {
        logError(error, { context: 'Invite User' });
        return sendJsonResponse(res, 400, 'error', error.message);
    }
});

/** POST to handle custom events. - Handles custom events based on the provided event name and data.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post('/customEvent', isAuthenticated, async (req, res) => {
    const { event, data } = req.body;
    try {
        sendJsonResponse(res, 200, 'success', 'Custom event processed');
    } catch (error) {
        logError(error, { context: 'Custom Event' });
        sendJsonResponse(res, 400, 'error', error.message);
    }
});

/** POST to track user activity. - Tracks the activity of the current user.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post('/trackUserActivity', isAuthenticated, requireSubdomain('chat'), async (req, res) => {
	const { activity } = req.body;
	try {
		await trackUserActivity(req.session.user.id, activity);
		sendJsonResponse(res, 200, 'success', 'User activity tracked');
	} catch (error) {
		logError(error, { context: 'Track User Activity' });
		sendJsonResponse(res, 400, 'error', error.message);
	}
});

/** POST to switch the theme. - Switches the theme for the current user.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post('/switchTheme', isAuthenticated, requireSubdomain('chat'), async (req, res) => {
	const { theme } = req.body;
	// Handle theme switching logic here
	sendJsonResponse(res, 200, 'success', 'Theme switched');
});

/** POST to create a clip. - Creates a new clip from a specific stream.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post('/createClip', isAuthenticated, requireSubdomain('chat'), async (req, res) => {
	const { streamId, clipData } = req.body;
	try {
		const clip = await createClip(streamId, req.session.user.id, clipData);
		sendJsonResponse(res, 201, 'success', 'Clip created', { clip });
	} catch (error) {
		logError(error, { context: 'Create Clip' });
		sendJsonResponse(res, 400, 'error', error.message);
	}
});

/** GET clips for a specific stream. - Retrieves all clips for a specific stream.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.get(['/getClips/:streamId', '/chat/getClips/:streamId'], isAuthenticated, requireSubdomain('chat'), async (req, res) => {
	try {
		const clips = await getClipsByStream(req.params.streamId);
		res.status(200).send(clips);
	} catch (error) {
		logError(error, { context: 'Get Clips' });
		res.status(400).send(error.message);
	}
});

/** POST to create a poll. - Creates a new poll with the provided question and options.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post('/createPoll', isAuthenticated, async (req, res) => {
	const { question, options } = req.body;
	try {
		const poll = await createPoll(question, options, req.session.user.id);
		sendJsonResponse(res, 201, 'success', 'Poll created', { poll });
	} catch (error) {
		logError(error, { context: 'Create Poll' });
		sendJsonResponse(res, 400, 'error', error.message);
	}
});

/** POST to vote in a poll. - Votes in a specific poll with the selected option.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post('/votePoll', isAuthenticated, async (req, res) => {
	const { pollId, optionId } = req.body;
	try {
		const poll = await votePoll(pollId, optionId, req.session.user.id);
		sendJsonResponse(res, 200, 'success', 'Vote recorded', { poll });
	} catch (error) {
		logError(error, { context: 'Vote in Poll' });
		sendJsonResponse(res, 400, 'error', error.message);
	}
});

/** GET poll results for a specific poll. - Retrieves the results of a specific poll.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.get('/pollResults/:pollId', isAuthenticated, async (req, res) => {
	try {
		const results = await getPollResults(req.params.pollId);
		res.status(200).send(results);
	} catch (error) {
		logError(error, { context: 'Get Poll Results' });
		res.status(400).send(error.message);
	}
});

/** POST to add a recommendation for a stream. - Adds a recommendation for a specific stream.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post('/addRecommendation', isAuthenticated, requireSubdomain('chat'), async (req, res) => {
    const { streamId } = req.body;
    try {
        await addRecommendation(req.session.user.id, streamId);
        sendJsonResponse(res, 200, 'success', 'Recommendation added', { streamId });
    } catch (error) {
        logError(error, { context: 'Add Recommendation' });
        sendJsonResponse(res, 400, 'error', error.message);
    }
});

/** GET recommendations for the logged-in user. - Retrieves all recommendations for the current user.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.get('/getRecommendations', isAuthenticated, requireSubdomain('chat'), async (req, res) => {
	try {
		const recommendations = await getRecommendations(req.session.user.id);
		res.status(200).send(recommendations);
	} catch (error) {
		logError(error, { context: 'Get Recommendations' });
		res.status(400).send(error.message);
	}
});

/** POST to analyze the sentiment of a text. - Analyzes the sentiment of the provided text.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post('/analyzeSentiment', isAuthenticated, requireSubdomain('chat'), (req, res) => {
    const { text } = req.body;
    try {
        const sentimentResult = analyzeSentiment(text);
        sendJsonResponse(res, 200, 'success', 'Sentiment analysis completed', { sentimentResult });
    } catch (error) {
        logError(error, { context: 'Analyze Sentiment' });
        sendJsonResponse(res, 400, 'error', error.message);
    }
});


/** POST to randomly vote in a poll. - This endpoint allows a user to randomly vote in a specified poll by selecting 
 * a random option from the available options in the poll.
 * @param {Object} req - The request object.
 * @param {Object} req.body - The body of the request.
 * @param {string} req.body.pollId - The ID of the poll to vote in.
 * @param {Object} res - The response object.
 */
router.post('/randomVotePoll', isAuthenticated, async (req, res) => {
    const { pollId } = req.body;
    try {
        const poll = await getPollById(pollId);
        const randomOption = QPRx2025.theOptions(poll.options);
        const updatedPoll = await votePoll(pollId, randomOption.id, req.session.user.id);
        sendJsonResponse(res, 200, 'success', 'Vote cast successfully', { updatedPoll });
    } catch (error) {
        logError(error, { context: 'Random Vote Poll' });
        sendJsonResponse(res, 400, 'error', error.message);
    }
});

/** POST to reward a random active user. - This endpoint selects a random active user (those who are online) 
 * and rewards them. The reward logic (e.g., points, badges) should be implemented where indicated.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post('/rewardActiveUser', isAuthenticated, hasRole('developer'), requireSubdomain('chat'), async (req, res) => {
    try {
        const users = checkUsers();
        const activeUsers = users.filter(user => user.status === 'online');
        if (activeUsers.length === 0) return sendJsonResponse(res, 404, 'error', 'No active users to reward');
        const rewardedUser = await rewardRandomActiveUser();
        sendJsonResponse(res, 200, 'success', `User ${rewardedUser.username} has been rewarded`, { rewardedUser });
    } catch (error) {
        logError(error, { context: 'Reward Active User' });
        sendJsonResponse(res, 400, 'error', error.message);
    }
});

/** POST to generate a secure token. - This endpoint generates a secure token using the Linear Congruential Generator (LCG) 
 * algorithm from the QPRx2025 module.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post('/generateSecureToken', isAuthenticated, (req, res) => {
    try {
        QPRx2025.init(Date.now());
        const secureToken = QPRx2025.lcg().toString(36).slice(2);
        sendJsonResponse(res, 200, 'success', 'Token generated', { token: secureToken });
    } catch (error) {
        logError(error, { context: 'Generate Secure Token' });
        sendJsonResponse(res, 400, 'error', error.message);
    }
});

/** Route to handle game requests.
 * @param {string} roomId - The name of the room where the game is played.
 */
router.get('/games/:game/:roomId', (req, res) => {
	const { game, roomId } = req.params;
	if (!validateRoomName(roomId)) {
		return res.status(404).render('error', {
			errorNum: 404,
			errorMessage: 'Invalid Room ID',
			errorDescription: `Room ID ${roomId} must be between 3 and 35 characters long.`,
			action: 'Return to Home Page',
			actionLink: '/'
		});
	}
	const room = checkRoom(roomId);
	if (!room) {
		return res.status(404).render('error', {
			errorNum: 404,
			errorMessage: 'Room Not Found',
			errorDescription: `The room with id ${roomId} does not exist.`,
			action: 'Return to Home Page',
			actionLink: '/'
		});
	}
	if (!req.session.user) {
		return res.status(401).render('error', {
			errorNum: 401,
			errorMessage: 'Unauthorized',
			errorDescription: 'You must be logged in to access this room.',
			action: 'Login Here',
			actionLink: '/?type=login'
		});
	}
	const { user } = req.session;
	const isPlayer = room.players.some(player => player.id === user.id);
	const isSpectator = !isPlayer && room.spectators.some(spectator => spectator.id === user.id);
	if (!isPlayer && !isSpectator) {
		return res.status(403).render('error', {
			errorNum: 403,
			errorMessage: 'Forbidden',
			errorDescription: 'You do not have permission to access this game as neither a player nor a spectator.',
			action: 'Return to Home Page',
			actionLink: '/'
		});
	}
	res.render('game', { roomId, game, isSpectator });
});

/** POST to Delete a user. - Deletes a specific user.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.post('/profile/deleteAccount', isAuthenticated, hasRole('developer'), async (req, res) => {
	const { userId } = req.body;
	try {
		await deleteUser(userId, req.session.user.id);
		sendJsonResponse(res, 200, 'success', 'User deleted');
	} catch (error) {
		logError(error, { context: 'Delete User' });
		sendJsonResponse(res, 400, 'error', error.message);
	}
});

/** Route to handle profile requests. - Retrieves and renders the profile page for a specific user.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.get('/profile/:userId', confirmProfile(), profileViewLimiter, async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).render('error', {
			errorNum: 400,
			errorMessage: 'Validation Error',
			errorDescription: errors.array().map(err => err.msg).join(', '),
			action: 'Return Home',
			actionLink: '/'
		});
	}
	const { userId } = req.params;
	let profile, csrfToken;
	try {
		profile = findUserById(userId) || findUserByUsername(userId);
		if (!profile || profile.privacy || !profile.verified) {
			return res.status(401).render('error', {
				errorNum: 401,
				errorMessage: 'Profile Not Found',
				errorDescription: 'Profile Not Found in the Database.',
				action: 'Return Home',
				actionLink: '/'
			});
		}
		if (profile.joinDate instanceof Date) profile.joinDate = profile.joinDate.toISOString();
		else {
			const date = new Date(profile.joinDate);
			if (!isNaN(date.getTime())) profile.joinDate = date.toISOString();
			else profile.joinDate = 'Unknown';
		}
		const isGuest = req.session?.user?.isGuest === true;
		const isLogged = req.session?.user && !isGuest;
		if (isLogged && !req.session.csrfToken) {
			return res.status(403).render('error', {
				errorNum: 403,
				errorMessage: 'CSRF Token Invalid',
				errorDescription: 'The CSRF token provided is invalid or missing. Please refresh the page and try again.',
				action: 'Return Home',
				actionLink: '/'
			});
		} else if (isLogged) csrfToken = req.session.csrfToken;
		profile.chatrooms = checkOwnedRoom(profile.username);
		profile.self = isLogged && req.session.user.id === profile.id;
		if (profile.self) {
			const code = Math.floor(100000 + QPRx2025.QuantumPollsRelay(900000));
			await updateUserProfile(profile.id, { code });
		}
		const domain = getBaseDomain(req.hostname);
		const headData = getHeadData('profile', { domain }, profile);
		res.render('profile', { profile, isLogged, csrfToken, headData });
	} catch (error) {
		logError(error, { context: 'Profile Page' });
		res.status(500).send(error.message);
	}
});

/** Handles profile updates for the user.
 * @route POST /profile/:userId
 * @param {string} userId - The ID of the user whose profile is being updated.
 */
router.post('/profile/:userId', isAuthenticated, confirmProfileUpdate(), profileUpdateLimiter, async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
	const { userId } = req.params;
	const { email, phone, code, profilePhoto, ...validatedData } = req.body;
	try {
		let profile = findUserById(userId) || findUserByUsername(userId);
		if (!profile || profile.privacy || !profile.verified) return res.status(404).json({ success: false, message: 'Profile Not Found.' });
		if (req.session.user.id !== profile.id) return res.status(403).json({ success: false, message: 'You can only edit your own profile.' });
		if (profile.code && !code) {
			if (email) await sendConfirmationEmail({ email, ...validatedData }, profile.code);
			else if (phone) await sendPhoneVerificationCode({ phone },  profile.code);
			return res.status(201).json({ success: 'waiting', message: `Check your ${(email) ? `email: ${maskEmail(email)}` : `phone: ${maskPhoneNumber(phone)}`} to verify updates.` });
		}
		if (profile.code && profile.code !== code) return res.status(404).json({ success: 'waiting', message: `Invalid verification code. Attempts left: ${req.rateLimit.remaining}` });
		const profileUpdated = Object.keys(validatedData).reduce((updates, key) => {
			if (validatedData[key] && validatedData[key] !== profile[key]) updates[key] = validatedData[key];
			return updates;
		}, {});
		if (email && email !== profile.email) profileUpdated.email = email;
		if (phone && phone !== profile.phone) profileUpdated.phone = phone;
		if (Object.keys(profileUpdated).length === 0) return res.status(400).json({ success: false, message: 'No changes provided.' });
		profileUpdated.profileUpdated = new Date();
		profileUpdated.code = '';
		if (profilePhoto) {
			profileUpdated.profilePhoto = profilePhoto || null;
			profileUpdated.approveAvatar = false;
		}
		updateUserProfile(userId, profileUpdated);
		res.status(200).json({ success: true, message: 'Profile successfully updated.' });
	} catch (error) {
		logError(error, { context: 'Profile Post' });
		res.status(500).json({ success: false, message: error.message });
	}
});

/** GET profiles - Filters profiles based on status, verification, and privacy settings.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.get('/profiles/:sortBy?', isAuthenticated, async (req, res) => {
    const isLogged = req.session?.user && req.session.csrfToken;
    const loggedInUser = isLogged ? req.session.user : null;
    const sortBy = req.params.sortBy;
    const validSortOptions = ['reverse', 'vip', 'status', 'following', 'follower', 'number', 'date'];
    const isSortValid = validSortOptions.includes(sortBy);
    const sortFunctions = {
        reverse: (a, b) => b.username.localeCompare(a.username, 'en', { numeric: true }),
        vip: (a, b) => b.isVip - a.isVip,
        status: (a, b) => b.status.localeCompare(a.status),
        following: (a, b) => b.following.length - a.following.length,
        follower: (a, b) => b.followers.length - a.followers.length,
        number: (a, b) => a.id - b.id,
        date: (a, b) => new Date(a.joinDate) - new Date(b.joinDate)
    };
    try {
        let profiles;
        const domain = getBaseDomain(req.hostname);
        const headData = getHeadData('users', { domain });
        if (cache.profiles && (Date.now() - cache.profilesTimestamp < 5 * 60 * 1000))  profiles = cache.profiles;
        else {
            profiles = checkUsers().filter(user => user.status !== 'offline' && user.verified === true && user.privacy === false);
            profiles.sort((a, b) => {
                const isFollowingA = loggedInUser && a.following.includes(loggedInUser.id);
                const isFollowingB = loggedInUser && b.following.includes(loggedInUser.id);
                if (isFollowingA && !isFollowingB) return -1;
                if (!isFollowingA && isFollowingB) return 1;
                if (a.isVip && !b.isVip) return -1;
                if (!a.isVip && b.isVip) return 1;
                return a.username.localeCompare(b.username, 'en', { numeric: true });
            });
            cache.profiles = profiles;
            cache.profilesTimestamp = Date.now();
        }
        if (isSortValid) profiles.sort(sortFunctions[sortBy]);
        if (loggedInUser) profiles = profiles.filter(profile => !loggedInUser.blocked.includes(profile.id));
        res.render('profileCards', {
            profiles: cleanProfileData(profiles),
            headData,
            isLogged
        });
    } catch (error) {
        res.status(500).send('Error loading profiles: ' + error.message);
    }
});

/** Handles incoming notifications for IPN or API requests
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware function
 */
//router.all('/:type/:provider', handleTypeOfPayment);

/** GET terms
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.get('/terms', webLimiter, (req, res) => {
	const domain = getBaseDomain(req.hostname);
	const headData = getHeadData('terms', { domain });
	res.render('terms', { email: `contact@${domain}`, headData });
});

/** GET about
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.get('/about', webLimiter, (req, res) => {
	const domain = getBaseDomain(req.hostname);
	const headData = getHeadData('about', { domain });
	res.render('about', { email: `contact@${domain}`, headData });
});

/** GET /robots.txt
 * Generates the robots.txt content dynamically based on the domain.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.get('/robots.txt', (req, res) => {
    const domain = getBaseDomain(req.hostname);
	const profilePath = req.query.userId ? `/profile/${req.query.userId}` : '/profile/admin';
    const realDomain = `${domain}${profilePath}`;
    const robotsTxtContent = `
        User-agent: *
        Allow: /*       
        Sitemap: https://${domain}/terms
        Sitemap: https://${domain}/about

		Allow: https://${realDomain}/*       
        Disallow: /forgot
        Disallow: /login
        Disallow: /register

        Crawl-delay: 10
    `;
    res.header('Content-Type', 'text/plain');
    res.send(robotsTxtContent);
});

/** Error handling for undefined routes. - Handles all other routes not defined above and returns a 404 error.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.use((req, res) => {
	res.status(404).render('error', {
		errorNum: 404,
		errorMessage: 'Page Not Found',
		errorDescription: `The page you are looking for does not exist.`,
		action: 'Return to Home Page',
		actionLink: '/'
	});
});

module.exports = (app) => {
	app.use('/', router);
};