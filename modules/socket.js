/*  ██╗██╗                                                                                           ██╗██╗
 *  ██║╚═╝  ███████╗████████╗██╗ ██████╗██╗  ██╗██████╗ ███╗   ███╗     ██████╗ ██████╗ ███╗   ███╗  ╚═╝██║
 *  ██║     ██╔════╝╚══██╔══╝██║██╔════╝██║ ██╔╝██╔══██╗████╗ ████║    ██╔════╝██╔═══██╗████╗ ████║     ██║
 *  ██║     ███████╗   ██║   ██║██║     █████╔╝ ██████╔╝██╔████╔██║    ██║     ██║   ██║██╔████╔██║     ██║
 *  ██║     ╚════██║   ██║   ██║██║     ██╔═██╗ ██╔═══╝ ██║╚██╔╝██║    ██║     ██║   ██║██║╚██╔╝██║     ██║
 *  ██║     ███████║   ██║   ██║╚██████╗██║  ██╗██║     ██║ ╚═╝ ██║ ██╗╚██████╗╚██████╔╝██║ ╚═╝ ██║     ██║
 *  ██║██╗  ╚══════╝   ╚═╝   ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝     ╚═╝ ╚═╝ ╚═════╝ ╚═════╝ ╚═╝     ╚═╝  ██╗██║
 *  ╚═╝╚═╝                                                                                           ╚═╝╚═╝
 * StickPM Project
 * © 2024 StickPM.com - Websocket/Socket.IO Module
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
 * This module provides utility functions for managing WebSocket connections,
 * handling WebRTC streams, and ensuring smooth user interaction in the StickPM
 * chatroom streaming application.
 * 
 * Need To-Do:
 * 1. validate game logic finishing it up and mafia action should be moved into other game socket controls
 * 2. Need to further enable2FA with the QRP module
 * 3. when updating game logic add another layer to game namespace to prevent spectators if not public.
 * 4. When stopping broadcast error occured and lost socket connection
 * 5. Clean image data before storing
 */

 const {
	processMessages,
	determineUserRole,
	getArchivedMessages,
	maxBroadcastersCheck,
	processRoomDonation,
	updateRoomDataGame,
	findUserByUsername,
	updateUserProfile,
	trackUserActivity,
	unmuteUserInRoom,
	muteUserInRoom,
	followStream,
	findUserById,
	followUser,
	roomData,
	blockUser,
	checkRole,
	unblockUser,
	isStreaming,
	unfollowUser,
	unfollowStream,
	changeUserRole,
	archiveMessage,
	startRecording,
	shadowBanUser,
	stopRecording,
	startStream,
	detectSpam,
	createRole,
	deleteRole,
	checkUsers,
	checkRoom,
	shareFile,
	endStream,
	addReaction,
	createClip,
	createPoll,
	votePoll,
	enable2FA,
	disable2FA,
	suspendUser,
	checkRateLimit,
	verifyUserEnabledGames
} = require('./database');

const {
	validateAlphanumeric,
	validateTimestamp,
	validateRoomName,
	analyzeSentiment,
	sanitizeMessage,
	validateOptions,
	validateParams,
	sanitizeInput,
	validateUUID,
	validateSDP,
	logError,
	isDigit,
} = require('./misc');

const { getBaseDomain } = require('./middleware');

//const { Chess } = require('../game/chess');
//const { Mafia } = require('../game/mafia');
const { Poker } = require('../game/poker');
const { Game21 } = require('../game/game21');
const { Battleship } = require('../game/battleship');
//const { Connect4 } = require('../game/connect4');

const WebRTC = require('wrtc');
const QPRx2025 = require('./QPRx2025');

/** Setup WebSocket connections for the provided namespace.
 * @param {Object} io - Socket.io instance.
 */
const setupWebSocket = (io, sharedsession, sessionMiddleware) => {
	const namespaces = {
		chat: io.of('/chat'),
		games: io.of('/games')
	};
	const setupNamespace = (namespace) => {
		namespace.use(sharedsession(sessionMiddleware, { autoSave: true }));
		namespace.use((socket, next) => {
			if (socket.handshake.session && socket.handshake.session.user) {
				next();
			} else {
				console.error('No session found in the handshake.');
				next(new Error('Authentication error: No session'));
			}
		});
		namespace.on('connection', (socket) => {
			if (!socket.handshake.session) {
				console.error('Session is missing in the handshake.');
				return;
			}
			console.log('Client connected:', socket.id);
			socket.on('error', (err) => {
				console.error(`Socket error on ${socket.id}:`, err);
				socket.disconnect(true);
			});
			socket.on('clientError', (err) => {
				console.error(`Client error on ${socket.id}:`, err);
				socket.disconnect(true);
			});
			//const host = socket.handshake.headers.host;
			//const subDomain = getBaseDomain(host, true);
			if (namespace.name === '/chat') {  //removed my best feature  && subDomain.includes('chat') to allow localhost and other without subdomains to connect to namespace
				setupChatHandlers(socket);
			} else if (namespace.name === '/games') {
				setupGameHandlers(socket);
			}
		});
	};	
	setupNamespace(namespaces.chat);
	//setupNamespace(namespaces.games);
};

/** Stores game data for each chatroom with active users
 * @typedef {Object} gameData Cache
 */
let gameData = {
	gameInstances: {},
	acceptedGames: ['chess', 'battleship', 'game21', 'poker', 'connect4', 'mafia'],
	pendingInvitations: {},
	gameParticipants: {},
	saveToDatabase: ({ roomId }) => {
		const updatedData = {
			gameInstances: this.gameInstances,
			pendingInvitations: this.pendingInvitations,
			gameParticipants: this.gameParticipants
		};
		const gameData = checkRoom(roomId.toLowerCase());
		if (gameData && gameData.gameData) gameData.gameData = { ...gameData.gameData, ...updatedData };
		else if (gameData) gameData.gameData = updatedData;
		if (gameData || gameData.gameData) updateRoomDataGame(roomId, gameData);
	}
};

/** Create a game instance based on the game type.
 * @param {string} gameType - The type of game to initialize.
 * @param {string} roomId - The ID of the room where the game will be initialized.
 * @param {string} playerId - The ID of the player initializing the game (default to socket.id).
 * @returns {Object} The initialized game instance.
 * @throws Will throw an error if the game type is unknown.
 */
const createGameInstance = (gameType, roomId, playerId = socket.id) => {
    const sanitized = validateAlphanumeric(gameType);
    const gameMap = {
        'chess': () => new Chess(roomId),
        'battleship': () => new Battleship(roomId),
        'game21': () => new Game21(roomId),
        'poker': () => new Poker(roomId),
        'connect4': () => new Connect4(roomId),
        'mafia': () => new Mafia(roomId)
    };
    const gameInstance = gameMap[sanitized]?.();
    if (!gameInstance)  throw new Error('Unknown game type.');
    gameData.gameParticipants[roomId] = {
        [playerId]: {
            opponentId: null,
            spectators: []
        }
    };
    return gameInstance;
};

/** Allow spectators to join a game session.
 * @param {Object} socket - Socket instance.
 */
const setupSpectatorHandlers = (socket) => {
	socket.on('game spectate', ({ roomId, gameType }) => {
		if (!gameData.acceptedGames.includes(gameType)) {
			socket.emit('error', { message: 'Game type is not accepted for spectating.' });
			return;
		}
		const gameInstance = gameData.gameInstances[roomId];
		if (!gameInstance) {
			socket.emit('error', { message: 'No game instance found for this room.' });
			return;
		}
		if (!gameData.gameParticipants[roomId]) gameData.gameParticipants[roomId] = {};
		gameData.gameParticipants[roomId][socket.id] = {
			opponentId: null,
			spectators: [ ...gameData.gameParticipants[roomId][socket.id]?.spectators || [], socket.id ]
		};
		socket.join(roomId);
		socket.emit('game spectator', { message: `Joined as spectator for ${gameType}`, username: socket.username });
		const gameState = gameInstance.getGameState();
		socket.emit('game update', { state: gameState });
	});
};

/** Setup additional games handler for the socket.
 * @param {Object} socket - Socket instance.
 */
const setupGameHandlers = (socket) => {
	socket.on('game start', async ({ gameType }) => {
		if (!gameData.acceptedGames.includes(gameType)) {
			socket.emit('error', { message: 'Game type is not accepted.' });
			return;
		}
		if (!gameData.gameInstances[socket.roomId]) {
			try {
				const gameInstance = createGameInstance(gameType, socket.roomId);
				gameData.gameInstances[socket.roomId] = gameInstance;
				io.to(socket.roomId).emit('game started', { gameType });
			} catch (error) {
				logError(error);
				socket.emit('error', { message: error.message, timestamp: Date.now() });
			}
		} else {
			socket.emit('error', { message: 'Game already started in this room.' });
		}
	});
	
	socket.on('game action', ({ action, data }) => {
		const gameInstance = gameData.gameInstances[socket.roomId];
		if (!gameInstance) {
			socket.emit('error', { message: 'No game instance found for this room.' });
			return;
		}
		const player = socket.username;
		const actionMap = {
			'joinGame': () => {
				if (gameInstance instanceof Battleship || gameInstance instanceof Poker || gameInstance instanceof Game21) {
					const success = gameInstance.addPlayer(player);
					if (success) io.to(socket.roomId).emit('game update', { message: `${player} has joined the game.` });
					else socket.emit('error', { message: 'Game is full or cannot add more players.' });
				}
			},
			'move': () => {
				if (gameInstance instanceof Chess) {
					const result = gameInstance.move(player, data.from, data.to);
					io.to(socket.roomId).emit('game update', { board: gameInstance.getGameState(), result });
				} else if (gameInstance instanceof Connect4) {
					const result = gameInstance.dropDisc(player, data.column);
					if (result.error) socket.emit('error', { message: result.error });
					else io.to(socket.roomId).emit('game update', { board: result.board, currentPlayer: result.currentPlayer, winner: result.winner });
				}
			},
			'placeShip': () => {
				if (gameInstance instanceof Battleship) {
					const result = gameInstance.placeShip(player, data.x, data.y, data.size, data.orientation);
					io.to(socket.roomId).emit('game update', { board: player.board, result });
				}
			},
			'validatePlacement': () => {
				if (gameInstance instanceof Battleship) {
					const isValid = gameInstance.isPlacementValid(player.board, data.x, data.y, data.size, data.orientation);
					socket.emit('placement validation', { valid: isValid });
				}
			},
			'attack': () => {
				if (gameInstance instanceof Battleship) {
					const result = gameInstance.attack(player, data.x, data.y);
					io.to(socket.roomId).emit('game update', { board: player.board, result });
				}
			},
			'hit': () => {
				if (gameInstance instanceof Game21) {
					gameInstance.hit(player);
					const bust = gameInstance.checkBust(player);
					io.to(socket.roomId).emit('game update', { hand: player.hand, bust });
				}
			},
			'stand': () => {
				if (gameInstance instanceof Game21) {
					const currentPlayer = gameInstance.endTurn();
					io.to(socket.roomId).emit('game update', { currentPlayer });
				}
			},
			'nextTurn': () => {
				if (gameInstance instanceof Poker || gameInstance instanceof Game21) {
					const currentPlayer = gameInstance.nextTurn();
					io.to(socket.roomId).emit('game update', { currentPlayer });
				}
			},
			'dealCards': () => {
				if (gameInstance instanceof Poker || gameInstance instanceof Game21) {
					gameInstance.dealCards();
					io.to(socket.roomId).emit('game update', { message: 'Cards dealt.', state: gameInstance.getGameState() });
				}
			},
			'bet': () => {
				if (gameInstance instanceof Poker) {
					const result = gameInstance.placeBet(player, data.amount);
					io.to(socket.roomId).emit('game update', { message: `${player} placed a bet.`, result });
				}
			},
			'endTurn': () => {
				if (gameInstance instanceof Game21) {
					const nextPlayer = gameInstance.nextTurn();
					io.to(socket.roomId).emit('game update', { message: `Next player's turn.`, nextPlayer });
				}
			},
			'resetGame': () => {
				if (gameInstance instanceof Battleship || gameInstance instanceof Poker || gameInstance instanceof Game21) {
					gameInstance.resetGame();
					io.to(socket.roomId).emit('game reset', { message: 'Game has been reset.' });
				}
			}
		};
		if (actionMap[action]) actionMap[action]();
		else {
			console.log(`Unknown game action: ${action}`);
			socket.emit('error', { message: `Unknown action: ${action}` });
		}
	});	

	socket.on('game leave', (data) => {
		const gameInstance = gameData.gameInstances[socket.roomId];
		if (!gameInstance) {
			socket.emit('error', { message: 'No game instance found for this room.' });
			return;
		}
		const playerId = socket.id;
		const roomId = socket.roomId;
		const participants = gameData.gameParticipants[roomId] || {};
		const playerData = participants[playerId] || {};
		const opponentId = playerData.opponentId;
		const spectators = playerData.spectators || [];
		/*if (socket.nsp.name === '/games') {
			console.log(`User ${socket.id} is leaving the games namespace.`);
			socket.leave('/games');
		}*/
		//socket.to(socket.roomId).brodcast.emit('game leave', { player: socket.username });
		if (opponentId) {
			io.to(opponentId).emit('game leave', { player: socket.username });
		}
		spectators.forEach(spectatorId => {
			io.to(spectatorId).emit('game leave', { player: socket.username });
		});
		if (gameInstance.isEmpty()) {
			delete gameData.gameInstances[roomId];
			delete gameData.gameParticipants[roomId];
		} else {
			delete participants[playerId];
			gameData.gameParticipants[roomId] = participants;
		}
		socket.leave('/games');
	});
	
	socket.on('mafia action', ({ action, data }) => {
		const gameInstance = gameData.gameInstances[socket.roomId];
		if (!gameInstance || !(gameInstance instanceof Mafia)) {
			socket.emit('error', { message: 'No Mafia game instance found for this room.' });
			return;
		}
		switch (action) {
			case 'vote':
				const result = gameInstance.vote(player, data.targetPlayer);
				io.to(socket.roomId).emit('mafia update', { result });
				break;
			case 'nightAction':
				const nightResult = gameInstance.nightAction(player, data.actionType, data.targetPlayer);
				io.to(socket.roomId).emit('mafia night update', { result: nightResult });
				break;
			default:
				socket.emit('error', { message: `Unknown action: ${action}` });
		}
	});

	socket.on('disconnect', () => {
		console.log('Client disconnected from games:', socket.id);
		const roomId = socket.roomId;
		const playerId = socket.id;
		if (gameData.gameParticipants[roomId]) {
			delete gameData.gameParticipants[roomId][playerId];
			if (Object.keys(gameData.gameParticipants[roomId]).length === 0) {
				delete gameData.gameParticipants[roomId];
			}
		}
		delete gameData.pendingInvitations[playerId];
	});

	setupSpectatorHandlers(socket);
};

/** Setup additional chat handlers for the socket.
 * @param {Object} socket - Socket instance.
 * @param {Object} session.user - Session with user profile data
 */
const setupChatHandlers = (socket) => {
	const data = socket.handshake.session?.user;
	const csrfData = socket.handshake.session;
	const fullUrl = socket.handshake.url;
	const roomId = fullUrl.split('/')[1] || null;
	if (data) {
		QPRx2025.init(Math.floor(Math.random() * 1e6));
		let guestNickname = 	`Guest_${QPRx2025.generateCharacters(6)}`;
		socket.username = 			data?.username || guestNickname;
		socket.roomsAccess = 		data?.roomsAccess || { ["Lobby"]: true };
		socket.mutedUsers = 		data?.mutedUsers || [];
		socket.blocked = 			data?.blocked || [];
		socket.credits = 			data?.credits || false;
		socket.roomId = 			roomId || null;
		socket.role = 				data?.role || 'guest';
		socket.bio = 				data?.bio || `This is a short bio about ${socket.username || 'Unknown'}.`,
		socket.isVip = 				data?.isVip || false;
		socket.privacy = 			data?.privacy || false;
		socket.profilePhoto = 		data?.profilePhoto || '/images/user-avatar.png';
		socket.twoFactorEnabled = 	data?.twoFactorEnabled || false;
		socket.notifcationSounds =  data?.notifcationSounds || false;
		socket.csrfToken = 			csrfData?.csrfToken || null;
		socket.uuid = 				data?.uuid || QPRx2025.generateUUID();
	}

	/** Handle the 'stickpm.com' event for a user joining a room.
	 * Validates the room name and username, assigns a role, and sets up the user in the room.
	 * @param {Object} param - The join data.
	 * @param {string} param.StickPMdomain - The domain of the room being joined.
	 * @param {string} param.username - The username of the joining user.
	 * @param {boolean} [param.roleType=false] - The role type of the user (guest or member).
	 */
	socket.on('stickpm.com', async ({ StickPMdomain }) => {
		try {
			if (!validateParams({ StickPMdomain }, { StickPMdomain: (value) => typeof value === 'string' })) throw new Error('Permission denied.');
			if (socket.roomId && StickPMdomain && socket.roomsAccess[StickPMdomain]) {
				const username = sanitizeInput(socket.username);
				if (!validateParams({ username }, { username: validateAlphanumeric })) throw new Error('Invalid username.');
				if (!socket.roomsAccess[StickPMdomain]) throw new Error('Permission denied.');
				const room = checkRoom(StickPMdomain.toLowerCase());
				if (!room) throw new Error('Room not found');
				if (!room.allowGuests && socket.role === 'guest') throw new Error('Guests are not allowed in this room.');
				const roomUsers = roomData.roomUsers[StickPMdomain] ||= new Set();
				if (Array.from(roomUsers).some(user => user.username === username)) throw new Error('Username is already in use.');
				const userRole = socket.role = determineUserRole(username, socket.role || 'guest', Array.from(roomUsers));
				//let userRole = await checkRole(StickPMdomain, username) || socket.role || 'guest';
				const userObject = {
					username: socket.username,
					role: userRole,
					id: socket.uuid,
					uuid: socket.uuid,
					status: socket.status = 'online',
					mutedUsers: socket.mutedUsers,
					blocked: socket.blocked,
					profilePhoto: socket.profilePhoto,
					bio: socket.bio
				};
				roomUsers.add(userObject);
				socket.join(socket.roomId = StickPMdomain);
				setupMessageHandlers(socket);
				setupWebRTCHandlers(socket);
				socket.emit('stickpm', { user: 'System', text: `Welcome, ${username}!`, timestamp: new Date(), loaded: true });
				socket.broadcast.to(StickPMdomain).emit('user-joined', { ...userObject, message: `${username} joined the room` });
				console.log(`User ${username} joined room ${socket.roomId}`);
				await trackUserActivity(username, `Joined room ${socket.roomId}`);
				socket.emit('populate-users', Array.from(roomUsers));
				const roomStreamers = roomData.senderStream[StickPMdomain] ||= [];
				if (roomStreamers.length) {
					const streams = roomStreamers.map(({ uuid, username, camslot }) => ({ uuid, username, camslot }));
					socket.emit('load broadcast', streams);
				}
				monitorUserInactivity(socket);
			} else throw new Error('Permission denied or invalid room details');
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now(), loading: true });
			socket.disconnect(true);
		}
	});	

	/** Handle a user disconnecting.
	 */
	socket.on('disconnect', async () => {
		try {
			const { roomId, username, uuid } = socket;
			if (!roomId || !username) return;
			const userSet = roomData.roomUsers[roomId];
			if (userSet) {
				const userObject = Array.from(userSet).find(user => user.id === uuid);
				if (userObject) userSet.delete(userObject);
				const activeSockets = Array.from(socket.nsp.sockets.values()).filter(s => s.roomId === roomId);
				if (activeSockets.length === 0) {
					processMessages(roomId, process.env.MSGARCHIVEDAYS || 1);
					delete roomData.roomUsers[roomId];
					delete roomData.senderStream[roomId];
					delete roomData.activeSpeakers[roomId];
				}
			}
			const message = `${username} exited the room`;
			console.log(`User ${username} exited room ${roomId}`);
			await trackUserActivity(username, `Exited room ${roomId}`);
			socket.broadcast.to(roomId).emit('user-left', { id: uuid, username, message });
			socket.broadcast.emit('user status', { userId: socket.id, type: 'disconnect' });
		} catch (error) {
			logError(error);
		} finally {
			stopBroadcasting(socket);
			socket.leaveAll();
			socket.removeAllListeners();
		}
	});
};

/** Monitor user inactivity and update status.
 * @param {Object} socket - The Socket instance.
 */
const monitorUserInactivity = (socket) => {
    const { roomId, uuid } = socket;
    const setUserStatus = async (status) => {
        try {
            const users = roomData.roomUsers[roomId];
            if (!users) return;
            const user = Array.from(users).find(({ id }) => id === uuid);
            if (user && user.status !== status) {
                user.status = socket.status = status;
                const statusUpdate = { id: user.id, status };
                if (user.role !== 'guest') await updateUserProfile(user.id, { status });
                socket.emit('statusUpdated', statusUpdate);
                socket.broadcast.to(roomId).emit('statusUpdated', statusUpdate);
                await trackUserActivity(user.username, `Updated status to ${status}`);
            }
        } catch (error) {
            console.error(`Error updating status for user ${uuid}:`, error);
        }
    };
    const handleInactivity = async () => {
        try {
            const users = roomData.roomUsers[roomId];
            const user = users ? Array.from(users).find(({ id }) => id === uuid) : null;
            if (!user) return;
            clearTimeout(roomData.userActivityTimeouts[user.id]);
            roomData.userActivityTimeouts[user.id] = setTimeout(async () => {
                if (user.status === 'online') await setUserStatus('away');
            }, 300000);
        } catch (error) {
            console.error(`Error handling inactivity for user ${uuid}:`, error);
        }
    };
    const resetInactivity = async () => {
        try {
            const users = roomData.roomUsers[roomId];
            const user = users ? Array.from(users).find(({ id }) => id === uuid) : null;
            if (!user) return;
            if (user.status === 'away') await setUserStatus('online');
            await handleInactivity();
        } catch (error) {
            console.error(`Error resetting inactivity for user ${uuid}:`, error);
        }
    };
    handleInactivity();
    const activityEvents = [
        'stickpm', 'message', 'typing', 'mousemove', 'keydown', 'updateStatus',
        'click', 'scroll', 'touchstart', 'touchmove', 'touchend',
        'pointerdown', 'pointermove', 'pointerup'
    ];
    activityEvents.forEach(event => socket.on(event, resetInactivity));
    socket.on('disconnect', () => {
        try {
            const timeoutId = roomData.userActivityTimeouts[uuid];
            if (timeoutId) {
                clearTimeout(timeoutId);
                delete roomData.userActivityTimeouts[uuid];
            }
        } catch (error) {
            console.error(`Error during disconnect cleanup for user ${uuid}:`, error);
        }
    });
};

/** Setup WebRTC handlers for the socket.
 * @param {Object} socket - Socket instance.
 */
const setupWebRTCHandlers = (socket) => {
	/** Handle the 'request consumer' event.
	 * @param {Object} data - The data for the requested consumer.
	 */
	socket.on('request consumer', async (data) => {
		try {
			if (!data) throw new Error('Permission denied');
			requestTrackEvents(socket, data);
		} catch (error) {
			logError(error);
		}
	});
	
	/** Handle the 'consumer' event.
	 * @param {Object} data - The data for the consumer.
	 * @param {Function} callback - The callback to execute after handling the event.
	 */
	socket.on('consumer', async (data, callback) => {
		try {
			if (!data) throw new Error('Permission denied');
			data.roomId = socket.roomId;
			const payload = await handleStreamer(data);
			if (payload) {
				console.log(` C: ${payload.uuid}`);
				callback(payload);
			}
		} catch (error) {
			logError(error);
		}
	});

	/** Handle the 'broadcast' event.
	 * @param {Object} data - The data for the broadcast.
	 * @param {Function} callback - The callback to execute after handling the event.
	 */
	socket.on('broadcast', async (data, callback) => {
		try {
			if (!data) throw new Error('Permission denied');
			if (maxBroadcastersCheck(socket.roomId)) {
				callback({ error: 'Maximum number of broadcasters reached' });
				return;
			}
			data.roomId = socket.roomId;
			const payload = await handleStartBroadcast(data, socket);
			if (payload) {
				console.log(` B: ${payload.uuid}`);
				await startStream(data.uuid, socket.roomId, socket.username);
				callback(payload);
			}
		} catch (error) {
			logError(error);
		}
	});

	/** Handle the 'load consumer' event.
	 * @param {Object} data - The data for the consumer.
	 * @param {Function} callback - The callback to execute after handling the event.
	 */
	socket.on('load consumer', async (data, callback) => {
		try {
			if (!data) throw new Error('Permission denied');
			data.roomId = socket.roomId;
			const payload = await loadExistingStreamer(data);
			if (payload) {
				console.log(` L C: ${payload.uuid}`);
				callback(payload);
			}
		} catch (error) {
			logError(error);
		}
	});

	/** Handle the 'stop broadcasting' event. */
	socket.on('stop broadcasting', async () => {
		try {
			stopBroadcasting(socket);
		} catch (error) {
			logError(error);
		}
	});

	/** Handle the 'push to talk' event.
	 * @param {Object} data - The data for the push to talk.
	 */
	socket.on('push to talk', ({ status }) => {
		try {
			if (!validateParams({ status }, { status: validateAlphanumeric })) throw new Error('Permission denied');
			handlePushToTalk(socket, status);
		} catch (error) {
			logError(error);
		}
	});

	/** Handle the 'pause playing stream' event.
	 * @param {Object} data - The data for the pause/playing event.
	 * @param {string} data.status - The status of the stream (pause/playing).
	 */
	socket.on('pause playing stream', ({ status }) => {
		try {
			if (!validateParams({ status }, { status: validateAlphanumeric })) throw new Error('Permission denied');
			handlePauseResumeStream(socket, status);
		} catch (error) {
			logError(error);
		}
	});

	/** Handle the 'ping' event. */
	socket.on('ping', () => {
		socket.emit('pong');
	});
};

/** Stops broadcasting for the provided socket.
 * @param {Object} socket - The socket instance of the broadcaster.
 */
const stopBroadcasting = async (socket) => {
    try {
        const roomId = socket.roomId;
        const senderStream = roomData.senderStream[roomId];
        if (senderStream) {
            const streamToRemove = senderStream.find((s) => s.uuid === socket.uuid);
            if (streamToRemove) {
                /*if (socket.adTimer) {
					clearTimeout(socket.adTimer);
					console.log('Advertisement timer cleared for:', socket.id);
					streamToRemove.adTimer = null;
				}*/
                await endStream(streamToRemove.uuid);
                socket.broadcast.emit('exit broadcast', streamToRemove.uuid);
                roomData.senderStream[roomId] = senderStream.filter((s) => s.uuid !== socket.uuid);
                updateStreamsOrder(roomId, socket);
                if (roomData.senderStream[roomId].length === 0) delete roomData.senderStream[roomId];
            }
        }
    } catch (error) {
        console.error(error);
    }
};

/** Handle streamer event.
 * @param {Object} data - Event data.
 * @param {Object} socket - Socket instance.
 * @returns {Object|null} - Payload for the streamer.
 */
const handleStreamer = async (data) => {
	try {
		const { uuid, roomId, sdp } = data;
		if (!data || !validateParams({ uuid, roomId, sdp }, { uuid: validateUUID, roomId: validateAlphanumeric, sdp: validateSDP }))  throw new Error('Permission denied');
		const stream = roomData.senderStream[roomId]?.find(s => s.uuid === uuid);
		if (!stream) throw new Error('Stream not found');
		const peer = new WebRTC.RTCPeerConnection();
		stream.track.getTracks().forEach(track => peer.addTrack(track, stream.track));
		await peer.setRemoteDescription(new WebRTC.RTCSessionDescription(sdp));
		const answer = await peer.createAnswer();
		await peer.setLocalDescription(answer);
		return {
			sdp: peer.localDescription,
			username: stream.username || null,
			camslot: stream.camslot || null,
			uuid: stream.uuid || null,
		};
	} catch (error) {
		logError(error);
		return { error: error.message };
	}
};

/** Handle start broadcast event.
 * @param {Object} data - Event data.
 * @param {Object} socket - Socket instance.
 * @returns {Object|null} - Payload for the broadcast.
 */
const messageRateLimit = 5;
const handleStartBroadcast = async (data, socket) => {
    try {
		const { uuid, username, roomId, camslot, sdp } = data;
		if (!data || !validateParams({ uuid, username, roomId, camslot, sdp }, { uuid: validateUUID, username: validateAlphanumeric, roomId: validateAlphanumeric, camslot: isDigit, sdp: validateSDP }))  throw new Error('Permission denied');
        if (!roomData.senderStream[roomId]) roomData.senderStream[roomId] = [];
		if (await isStreaming(uuid, roomId)) throw new Error('Permission denied');
        const peer = new WebRTC.RTCPeerConnection();
        peer.ondatachannel = (event) => {
            try {
                const dataChannel = event.channel;
                const peerId = uuid;
                let messageCount = 0;
                let messageTimer = null;
                const resetMessageCount = () => {
                    messageCount = 0;
                };
                dataChannel.onmessage = (messageEvent) => {
                    try {
                        const message = messageEvent.data;
                        messageCount++;
                        if (messageCount > messageRateLimit) {
                            console.warn(`Message rate limit exceeded for peer ${peerId}. Closing data channel.`);
                            dataChannel.close();
                            return;
                        }
                        if (message === 'ping') dataChannel.send('pong');
                        else {
                            console.warn(`Unexpected message from peer ${peerId}: ${message}. Closing data channel.`);
                            dataChannel.close();
                        }
                    } catch (error) {
                        console.error(`Error in dataChannel.onmessage for peer ${peerId}:`, error);
                    }
                };
                dataChannel.onclose = () => {
                    clearInterval(messageTimer);
                    messageTimer = null;
                    console.log(`Data channel with peer ${peerId} closed.`);
                };
                dataChannel.onerror = (error) => {
                    console.error(`Data channel error with peer ${peerId}:`, error);
                };
                messageTimer = setInterval(resetMessageCount, 1000);
            } catch (error) {
                console.error(`Error in peer.ondatachannel for peer ${uuid}:`, error);
            }
        };
        peer.onconnectionstatechange = () => {
            try {
                if (peer.connectionState === 'closed' || peer.connectionState === 'disconnected' || peer.connectionState === 'failed') {
                    console.log(`Peer connection with ${uuid} ${peer.connectionState}. Stopping broadcast.`);
                    stopBroadcasting(socket);
                    peer.close();
                }
            } catch (error) {
                console.error(`Error in peer.onconnectionstatechange for peer ${uuid}:`, error);
            }
        };
        peer.ontrack = (event) => {
            try {
                if (!event || !event.streams || event.streams.length === 0) return;
                const [stream] = event.streams;
                if (!stream) return;
                if (stream.getVideoTracks().length > 0 || stream.getAudioTracks().length > 0) handleTrackEvents(socket, event, data);
            } catch (error) {
                console.error(`Error in peer.ontrack for peer ${uuid}:`, error);
            }
        };
        socket.on('disconnect', () => {
            peer.close();
        });
        uuid = socket.uuid;
        username = socket.username;
        await peer.setRemoteDescription(new WebRTC.RTCSessionDescription(sdp));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        return {
            sdp: peer.localDescription,
            username: username,
            camslot: camslot,
            uuid: uuid
        };
    } catch (error) {
        console.error('Error during handleStartBroadcast:', error);
        peer.close();
        return null;
    }
};

/** Request track events.
 * @param {Object} socket - Socket instance.
 * @param {Object} data - Additional data.
 */
const requestTrackEvents = async (socket, data) => {
    try {
		const { uuid, username } = data;
		if (!data || !validateParams({ uuid, username }, { uuid: validateUUID, username: validateAlphanumeric }))  throw new Error('Permission denied');
        const senderStreams = roomData.senderStream[socket.roomId];
        if (!senderStreams) return false;
        const streamIndex = senderStreams.findIndex(s => s.uuid === uuid);
        if (streamIndex >= 0 && await isStreaming(uuid, socket.roomId)) {
            socket.emit('new broadcast', { 
                uuid: uuid, 
                username: username 
            });
            return true;
        }
        return false;
    } catch (error) {
        logError(error);
        return false;
    }
};

/** Handle track events.
 * @param {Object} socket - Socket instance.
 * @param {Object} e - Event data.
 * @param {Object} data - Additional data.
 */
const handleTrackEvents = (socket, e, data) => {
    try {
		const { uuid, username, roomId, camslot } = data;
		if (!data || !validateParams({ uuid, username, roomId, camslot }, { uuid: validateUUID, username: validateAlphanumeric, roomId: validateAlphanumeric, camslot: isDigit }))  throw new Error('Permission denied');
        if (!roomData.senderStream[roomId]) roomData.senderStream[roomId] = [];
        const streamInfo = {
            track: e.streams[0],
            camslot: camslot || null,
            username: username || socket.username || null,
            uuid: uuid || socket.uuid,
            startTime: Date.now(),
        };
		//startAdvertisementTimer(streamInfo, roomId, socket);
        roomData.senderStream[roomId].push(streamInfo);
        socket.broadcast.to(roomId).emit('new broadcast', {
            uuid: streamInfo.uuid,
            username: streamInfo.username,
            camslot: streamInfo.camslot
        });
        updateStreamsOrder(socket.roomId, socket);
    } catch (error) {
        logError(error);
    }
};

/** Load existing consumer.
 * @param {Object} data - Event data.
 * @returns {Object|null} - Payload for the consumer.
 */
const loadExistingStreamer = async (data) => {
	try {
		const { uuid, roomId, sdp } = data;
		if (!data || !validateParams({ uuid, roomId, sdp }, { uuid: validateUUID, roomId: validateAlphanumeric, sdp: validateSDP }))  throw new Error('Permission denied');
		const stream = roomData.senderStream[roomId]?.find(s => s.uuid === uuid);
		if (!stream) throw new Error('Stream not found or no streams available');
		const peer = new WebRTC.RTCPeerConnection();
		stream.track.getTracks().forEach(track => peer.addTrack(track, stream.track));
		await peer.setRemoteDescription(new WebRTC.RTCSessionDescription(sdp));
		const answer = await peer.createAnswer();
		await peer.setLocalDescription(answer);
		return {
			sdp: peer.localDescription,
			username: stream.username || null,
			camslot: stream.camslot || null,
			uuid: stream.uuid || null,
		};
	} catch (error) {
		logError(error);
		return null;
	}
};

/** Handle push-to-talk event.
 * @param {Object} socket - The socket instance.
 * @param {string} status - The push-to-talk status ('start' or 'stop').
 */
const handlePushToTalk = async (socket, status) => {
	try {
		if (typeof status !== 'string') throw new TypeError('Input must be a string.');
		const { roomId, uuid, username, nsp } = socket;
		console.log(`handlePushToTalk used by ${username} in room ${roomId}`);
		const room = checkRoom(roomId.toLowerCase());
		if (!room) throw new Error('Room not found');
		if (room.mutedUsers.includes(uuid)) throw new Error('You are muted and cannot use push-to-talk');
		const user = checkUsers().find(u => u.id === uuid);
		const allowedRoles = new Set(['moderator', 'super', 'admin', 'owner', 'developer']);
		const isPrivileged = allowedRoles.has(user?.role);
		const speakers = roomData.activeSpeakers;
		const isSpeaker = speakers.get(roomId) === uuid;
		const isAdditionalSpeaker = speakers.get(`${roomId}_additional`) === uuid;
		const emitPushToTalk = (status) => nsp.to(roomId).emit('push to talk', { speaker: uuid, username, status });
		if (status === 'start') {
			if (!speakers.has(roomId)) {
				speakers.set(roomId, uuid);
				emitPushToTalk('start');
			} else if (isPrivileged && !isSpeaker) {
				if (!speakers.has(`${roomId}_additional`)) {
					speakers.set(`${roomId}_additional`, uuid);
					emitPushToTalk('start');
				} else throw new Error('Another privileged user is already speaking');
			} else throw new Error('Another user is already speaking');
		} else if (status === 'stop') {
			if (isSpeaker) {
				speakers.delete(roomId);
				emitPushToTalk('stop');
			} else if (isAdditionalSpeaker) {
				speakers.delete(`${roomId}_additional`);
				emitPushToTalk('stop');
			}
		}
	} catch (error) {
		logError(error);
		socket.emit('error', { message: error.message, timestamp: Date.now() });
	}
};

/** Update streams order.
 * @param {string} roomId - Room ID.
 * @param {Object} socket - Socket instance.
 */
const updateStreamsOrder = (roomId, socket) => {
	try {
		const streamOrder = roomData.senderStream[roomId]?.map((stream, index) => ({
			uuid: stream.uuid,
			index,
			username: stream.username,
			camslot: stream.camslot
		})) || [];
		socket.nsp.to(roomId).emit('update stream order', streamOrder);
	} catch (error) {
		logError(error);
	}
};

/** Handle pause/playing stream events.
 * @param {Object} socket - Socket instance.
 * @param {string} status - Pause/playing status.
 */
const handlePauseResumeStream = (socket, status) => {
	if (typeof status !== 'string') throw new TypeError('Input must be a string.');
	try {
		console.log(`handlePauseResumeStream used by ${socket.username} in room ${socket.roomId} with status ${status}`);
		const uuid = socket.uuid;
		socket.broadcast.to(socket.roomId).emit('stream status', { uuid, status });
	} catch (error) {
		logError(error);
	}
};

/** Define the advertisementData constant
 * @constant {Array<Object>} advertisementData
 */
const advertisementData = [
    { type: 'video', src: 'ads/lake.mp4', duration: 30000 },	// Play lake.mp4 for 30 seconds
    { type: 'image', src: 'ads/stickpm1', duration: 5000 },		// Display stickpm1 image for 5 seconds (any format)
    { type: 'video', src: 'ads/field.mp4', duration: 30000 },	// Play field.mp4 for 30 seconds
    { type: 'image', src: 'ads/stickpm2', duration: 5000 },		// Display stickpm2 image for 5 seconds (any format)
];

/** Starts the periodic advertisement stream, replacing the current stream temporarily.
 * @param {Object} streamInfo - Information about the current stream.
 * @param {string} roomId - The room ID where the stream is being broadcasted.
 * @param {Object} socket - The socket instance of the broadcaster.
 */
const startPeriodicAdvertisementStream = async (streamInfo, roomId, socket) => {
    try {
        const adStream = await generateAdvertisementStream(advertisementData);
        const adStreamInfo = {
            track: adStream,
            camslot: streamInfo.camslot,
            username: streamInfo.username,
            uuid: streamInfo.uuid,
            isAdvertisement: true,
            originalStreamInfo: streamInfo,
        };
        const senderStream = roomData.senderStream[roomId];
        const index = senderStream.findIndex((s) => s.uuid === streamInfo.uuid);
        if (index !== -1) senderStream[index] = adStreamInfo;
        else  senderStream.push(adStreamInfo);
        socket.nsp.to(roomId).emit('new broadcast', {
            uuid: adStreamInfo.uuid,
            username: adStreamInfo.username,
            camslot: adStreamInfo.camslot,
            isAdvertisement: true,
        });
        updateStreamsOrder(roomId, socket);
        const totalAdDuration = advertisementData.reduce((sum, ad) => sum + ad.duration, 0);
        await new Promise((resolve) => setTimeout(resolve, totalAdDuration));
        restoreOriginalStream(streamInfo, roomId, socket);
    } catch (error) {
        logError(error);
    }
};

/** Starts a timer to periodically replace the stream with advertisements every hour.
 * @param {Object} streamInfo - Information about the current stream.
 * @param {string} roomId - The room ID where the stream is being broadcasted.
 * @param {Object} socket - The socket instance of the broadcaster.
 */
const startAdvertisementTimer = (streamInfo, roomId, socket) => {
    const oneHour = 3600000;
    if (streamInfo.adTimer) clearTimeout(streamInfo.adTimer);
    streamInfo.adTimer = setTimeout(async () => {
        try {
            await startPeriodicAdvertisementStream(streamInfo, roomId, socket);
            startAdvertisementTimer(streamInfo, roomId, socket);
        } catch (error) {
            logError(error);
        }
    }, oneHour);
};

/** Generates a MediaStream containing advertisement content to be streamed to clients.
 * @param {Array<Object>} advertisementData - An array of advertisement items with type, src, and duration.
 * @returns {Promise<MediaStream>} A MediaStream object containing the advertisement video track.
 */
const generateAdvertisementStream = async (advertisementData) => {
    const { RTCVideoSource } = WebRTC.nonstandard;
    const videoSource = new RTCVideoSource();
    const videoTrack = videoSource.createTrack();
    const mediaStream = new WebRTC.MediaStream();
    mediaStream.addTrack(videoTrack);
    const playAdvertisements = async () => {
        for (const ad of advertisementData) {
            if (ad.type === 'video') console.log(`Playing video ad: ${ad.src}`);
            else if (ad.type === 'image') {
                const imageFormats = ['png', 'jpg', 'jpeg', 'gif', 'bmp']; // Common image formats
                let imageFound = false;
                for (const format of imageFormats) {
                    const imagePath = `${ad.src}.${format}`;
                    if (fs.existsSync(imagePath)) {
                        console.log(`Displaying image ad: ${imagePath}`);
                        imageFound = true;
                        break;
                    }
                }
                if (!imageFound) console.error(`Image not found for ad: ${ad.src}`);
            }
            await new Promise((resolve) => setTimeout(resolve, ad.duration));
        }
    };
    playAdvertisements().catch((error) => {
        console.error('Error in playAdvertisements:', error);
    });
    return mediaStream;
};

/** Restores the original stream after the advertisement has finished playing.
 * @param {Object} streamInfo - Information about the original stream.
 * @param {string} roomId - The room ID where the stream is being broadcasted.
 * @param {Object} socket - The socket instance of the broadcaster.
 */
const restoreOriginalStream = (streamInfo, roomId, socket) => {
    try {
        const senderStream = roomData.senderStream[roomId];
        const index = senderStream.findIndex((s) => s.uuid === streamInfo.uuid);
        if (index !== -1) senderStream[index] = streamInfo;
        else senderStream.push(streamInfo);
        socket.nsp.to(roomId).emit('new broadcast', {
            uuid: streamInfo.uuid,
            username: streamInfo.username,
            camslot: streamInfo.camslot,
            isAdvertisement: false,
        });
        updateStreamsOrder(roomId, socket);
    } catch (error) {
        logError(error);
    }
};

/** Check if a user has the necessary permissions to perform an action.
 * @param {Object} socket - The socket instance.
 * @param {string} requiredRole - The required role for the action.
 * @returns {boolean} - True if the user has the necessary permissions, false otherwise.
 */
const hasPermission = (socket, requiredRole) => {
	const user = Array.from(roomData.roomUsers[socket.roomId]).find(user => user.id === socket.uuid);
	if (!user) return false;
	const userRole = user.role;
	const roleHierarchy = ['guest', 'member', 'moderator', 'admin', 'owner', 'developer'];
	return roleHierarchy.indexOf(userRole) >= roleHierarchy.indexOf(requiredRole);
};

/** Check if the user has a valid role and the required role.
 * @param {Object} user - The user object containing the current role.
 * @param {string} role - The role to check against.
 * @returns {boolean} - True if the user has the required role, false if not or invalid role.
 */
const hasRole = (user, role) => {
	const validRoles = ['developer', 'owner', 'admin', 'super'];
	const roleHierarchy = {
		'guest': 1,
		'member': 2,
		'moderator': 3,
		'admin': 4,
		'super': 5,
		'owner': 6,
		'developer': 7
	};
	if (!user.role || !roleHierarchy[user.role] || !roleHierarchy[role]) return false;
	if (!validRoles.includes(role)) return false;
	return roleHierarchy[user.role] >= roleHierarchy[role];
};

/** Handle the 'approveProfile' event.
 * @param {Object} param - The approval data.
 * @param {string} param.userId - The ID of the user whose profile is being approved.
 * @param {boolean} param.approved - The approval status.
 */
const approveProfile = async ({ userId, approved }) => {
	try {
		if (!validateParams({ userId }, { userId: validateUUID })) throw new Error('Permission denied');
		const userSocket = userId
			? Array.from(socket.nsp.sockets.values()).find(s => s.uuid === userId)
			: null;
		if (userId && userSocket && hasPermission(socket, 'developer')) {
			const pendingApproval = roomData.approvalRequests.find(r => r.userId === userId && !r.approved);
			if (pendingApproval) {
				if (approved) {
					await updateUserProfile(userId, { profilePhoto: pendingApproval.profile.profilePhoto });
					userSocket.emit('updateProfile', { data: true, profile: pendingApproval.profile });
				} else userSocket.emit('updateProfile', { data: false });
				roomData.approvalRequests = roomData.approvalRequests.filter(r => r.userId !== userId);
			}
		} else if (!userId) {
			Array.from(socket.nsp.sockets.values())
				.filter(s => Array.from(roomData.roomUsers[socket.roomId]).some(u => u.id === s.uuid && u.role === 'developer'))
				.forEach(developerSocket => {
					const pendingApproval = roomData.approvalRequests.find(r => !r.approved);
					if (pendingApproval) developerSocket.emit('profileApprovalRequest', pendingApproval);
				});
		}
	} catch (error) {
		logError(error);
		socket.emit('error', { message: error.message, timestamp: Date.now() });
	}
};

//approveProfile(); Can be called to sent to all developer roles online & should check profile.approveAvatar's for true if needing approval

/** Setup additional message handlers for the socket.
 * @param {Object} socket - Socket instance.
 */
const setupMessageHandlers = (socket) => {
	/** Handle the 'updateStatus' event.
	 * @param {Object} param - The status data.
	 * @param {string} param.status - The new status.
	 * @param {Object|null} param.profile - The profile data.
	 */
	socket.on('updateStatus', async ({ status, profile = { approveAvatar: false } }) => {
		const { roomId, uuid } = socket;
		//const { approveAvatar } = profile;
		//const { id, username, role, status, manualStatus, avatar, approveAvatar } = profile;
		if (roomId && roomData.roomUsers[roomId]) {
			if (!validateParams({ status }, { status: validateAlphanumeric })) socket.emit('error', { message: 'Permission denied', timestamp: Date.now() });
			const user = Array.from(roomData.roomUsers[roomId]).find(user => user.id === uuid);
			if (user) {
				user.status = status;
				if (profile.approveAvatar) {
					const pendingApproval = {
						userId: uuid,
						profile,
						approved: false
					};
					roomData.approvalRequests.push(pendingApproval);
					Array.from(socket.nsp.sockets.values())
						.filter(s => Array.from(roomData.roomUsers[roomId]).some(u => u.id === s.uuid && u.role === 'developer'))
						.forEach(developerSocket => developerSocket.emit('profileApprovalRequest', pendingApproval));
				}
				socket.emit('statusUpdated', user);
				socket.to(roomId).emit('statusUpdated', user);
			}
		}
	});	

	/** Handle the 'approveProfile' event.
	 */
	socket.on('approveProfile', approveProfile);

	/** Handle the 'poke' event.
	 * @param {Object} data - The poke data.
	 * @param {string} id - The ID of the user to poke.
	 * @param {string} data.username - The username of the user to poke.
	 */
	socket.on('poke', async ({ id }) => {
		try {
			if (!validateParams({ id }, { id: validateAlphanumeric })) throw new Error('Permission denied');
			const roomId = socket.roomId;
			const roomUsers = roomData.roomUsers[roomId] ||= new Set();
			const userToPoke = [...roomUsers].find(user => user.id === id);
			if (!userToPoke) throw new Error('User not found in the room');
			const isBlocked = [...roomUsers].some(user => user.uuid === socket.uuid && user.blocked.includes(userToPoke.id));
			if (isBlocked) throw new Error(`You cannot poke ${userToPoke.username} as you are blocked.`);
			const currentTime = Date.now();
			const userTimestamp = roomData.userPokeTimestamps[socket.uuid] || 0;
			const targetUserTimestamp = roomData.userPokeTimestamps[id] || 0;
			if (currentTime - userTimestamp < 15000) throw new Error('You can only poke once every 15 seconds');
			if (currentTime - targetUserTimestamp < 5000) throw new Error('The user has already been poked recently');
			const targetSocket = Array.from(socket.nsp.sockets.values()).find(s => s.uuid === userToPoke.id);
			if (targetSocket) {
				if (targetSocket !== socket) {
					targetSocket.emit('poked', { from: socket.uuid, fromUsername: socket.username });
					socket.emit('poked', { to: userToPoke.id, username: userToPoke.username });
					roomData.userPokeTimestamps[socket.uuid] = currentTime;
					roomData.userPokeTimestamps[id] = currentTime;
				} else if (targetSocket === socket) throw new Error('You can only poke others');
			} else throw new Error('User not found, Try again');
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handle the 'sendMessage' event.
	 * @param {string} message - The message to send.
	 */
	socket.on('sendMessage', async (message) => {
		try {
			message = sanitizeMessage(message);
			const roleMaxLimits = {
				'guest': { maxChars: 500, maxEmojis: 10 },
				'member': { maxChars: 500, maxEmojis: 10 },
				'moderator': { maxChars: 700, maxEmojis: 15 },
				'admin': { maxChars: 900, maxEmojis: 20 },
				'super': { maxChars: 1100, maxEmojis: 25 },
				'owner': { maxChars: 1300, maxEmojis: 30 },
				'developer': { maxChars: 1500, maxEmojis: 35 }
			};
			const limits = roleMaxLimits[socket.role] || roleMaxLimits['guest'];
			const emojiRegex = /(\p{Extended_Pictographic})/gu;
			const emojiUsed = message.match(emojiRegex) || [];
			const emojiCount = emojiUsed.length;
			if (message.trim().length === 0 && emojiCount === 0) throw new Error('Message must contain content.');
			if (emojiCount > limits.maxEmojis) throw new Error(`Your message contains too many emojis. Max allowed is ${limits.maxEmojis}.`);
			const currentTime = Date.now();
			socket.userMsgTimestamps ||= [];
			if (message.length > limits.maxChars) throw new Error(`Your message is too long. Please keep it under ${limits.maxChars} characters.`);
			const recentMessages = socket.userMsgTimestamps.filter(timestamp => currentTime - timestamp < 2000);
			if (detectSpam(message, recentMessages.slice(-3))) throw new Error('Do not spam.');
			socket.userMsgTimestamps.push(currentTime);
			const sentimentAnalysis = analyzeSentiment(message);
			QPRx2025.init(new Date());
			const archivedMessage = {
				id: QPRx2025.generateUUID(),
				uuid: socket.uuid,
				user: socket.username,
				role: socket.role,
				text: message,
				timestamp: currentTime,
				sentiment: sentimentAnalysis
			};
			if (socket.role !== 'guest' && !socket.privacy) archiveMessage(socket.roomId, archivedMessage);
			const roomUsers = Array.from(roomData.roomUsers[socket.roomId]);
			roomUsers.forEach(user => {
				if (!user.blocked?.includes(socket.uuid)) {
					const targetSocket = Array.from(socket.nsp.sockets.values()).find(s => s.uuid === user.uuid);
					if (targetSocket) targetSocket.emit('message', archivedMessage);
				}
			});
			const mentionedUsername = message.match(/@(\w+)/);
			if (mentionedUsername) {
				const username = mentionedUsername[1];
				const mentionedUser = roomUsers.find(user => user.username === username);
				if (mentionedUser && !mentionedUser.blocked?.includes(socket.uuid)) {
					const targetSocket = Array.from(socket.nsp.sockets.values()).find(s => s.uuid === mentionedUser.uuid);
					if (targetSocket && targetSocket !== socket) targetSocket.emit('highlightMessage', { id: archivedMessage.id });
				}
			}
		} catch (error) {
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handle the 'whisperMessage' event.
	 * @param {Object} param - The whisper message data.
	 * @param {string} param.toUserId - The ID of the user to whisper to.
	 * @param {Object} param.message - The message data.
	 * @param {string} param.message.user - The user sending the message.
	 * @param {string} param.message.text - The message text.
	 */
	socket.on('whisperMessage', async ({ toUserId, message }) => {
		try {
			message = sanitizeMessage(message);
			if (!validateParams({ toUserId }, { toUserId: validateUUID })) throw new Error('Permission denied');
			const maxChars = 500;
			const currentTime = Date.now();
			const userTimestamps = roomData.userMsgTimestamps[socket.uuid] || [];
			const recentMessages = userTimestamps.filter(timestamp => currentTime - timestamp < 2000);
			if (detectSpam(message, recentMessages.slice(-3))) throw new Error('Do not spam.');
			if (recentMessages.length >= 3) throw new Error('You are sending messages too quickly. Please slow down.');
			if (message.length > maxChars) throw new Error(`Your message is too long. Please keep it under ${maxChars} characters.`);
			if (!message.trim()) throw new Error('Message must contain content.');
			userTimestamps.push(currentTime);
			roomData.userMsgTtimestamps[socket.uuid] = userTimestamps;
			const sentimentAnalysis = analyzeSentiment(message);
			const user = findUserById(toUserId);
			if (user) {
				const isBlocked = Array.from(user.blocked).some(blockedUser => blockedUser.uuid === socket.uuid);
				if (isBlocked) throw new Error(`You cannot whisper ${user.username} you are blocked.`);
				QPRx2025.init(new Date());
				const whisperMessage = {
					id: QPRx2025.generateUUID(),
					username: socket.username,
					userId: socket.uuid,
					text: message,
					timestamp: new Date(),
					sentiment: sentimentAnalysis
				};
				const targetSocket = Array.from(socket.nsp.sockets.values()).find(s => s.uuid === toUserId);
				if (targetSocket && targetSocket !== socket) {
					if (!targetSocket.whisper) targetSocket.whisper = {};
					if (!targetSocket.whisper[socket.uuid]) targetSocket.whisper[socket.uuid] = [];
					targetSocket.whisper[socket.uuid].push(whisperMessage);
				}
				socket.emit('whisper', whisperMessage);
				socket.to(toUserId).emit('whisper', whisperMessage);
			}
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handle the 'readMessage' event for whispers.
	 * @param {Object} param - The read message data.
	 * @param {string} param.messageId - The message ID.
	 * @param {string} param.userId - The user ID.
	 */
	socket.on('readMessage', async ({ messageId, userId }) => {
		try {
			if (!validateParams({ messageId, userId }, { messageId: validateUUID, userId: validateUUID })) throw new Error('Permission denied');
			const user = findUserById(userId);
			if (!user) throw new Error('Permission denied');
			socket.to(socket.roomId).emit('readReceipt', { messageId, userId });
			const messages = socket.whisper?.[userId] || [];
			const readMessageIndex = messages.findIndex(msg => msg.id === messageId);
			if (readMessageIndex > -1) {
				const readMessageTimestamp = messages[readMessageIndex].timestamp;
				socket.whisper[userId] = messages.filter(msg => msg.timestamp >= readMessageTimestamp);
			}
			//delete socket.whisper?.[userId]?.[messageId];
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handle the 'whisperClosed' event.
	 * Clears whisper messages for both the target user and the sender.
	 * @param {string} toUserId - The ID of the user whose whisper session is closed.
	 */
	socket.on('whisperClosed', (toUserId) => {
		if (!validateParams({ toUserId }, { toUserId: validateUUID })) throw new Error('Permission denied');
		const user = findUserById(toUserId);
		if (!user) throw new Error('Permission denied');
		if (socket.whisper?.[toUserId]) delete socket.whisper[toUserId];
		const targetSocket = Array.from(socket.nsp.sockets.values()).find(s => s.uuid === toUserId);
		if (targetSocket?.whisper?.[socket.uuid]) delete targetSocket.whisper[socket.uuid];
	});

	/** Handle the 'requestMessages' event.
	 * @param {Object} param - The room data.
	 * @param {string} param.roomId - The room ID to request messages for.
	 */
	socket.on('requestMessages', async ({ roomId = socket.roomId }) => {
		try {
			if (!validateParams({ roomId }, { roomId: validateAlphanumeric }) || !roomData.roomUsers[roomId]) throw new Error('Permission denied');
			const messages = await getArchivedMessages(roomId);
			socket.emit('messages', messages);
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handle the 'typing' event for whispers.
	 * @param {Object} param - The typing data.
	 * @param {string} param.username - The username of the typing user.
	 */
	socket.on('typing', async ({ username }) => {
		try {
			if (!validateParams({ username }, { username: validateAlphanumeric })) throw new Error('Permission denied');
			socket.emit('typing', { username });
			socket.to(socket.roomId).emit('typing', { username });
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handle the 'createPoll' event for polls tab.
	 * @param {Object} param - The poll data.
	 * @param {string} param.question - The poll question.
	 * @param {Array} param.options - The poll options.
	 */
	socket.on('createPoll', async ({ question, options }) => {
		try {
			if (!validateParams({ question, options }, { question: validateAlphanumeric, options: validateOptions })) throw new Error('Permission denied');
			const user = Array.from(roomData.roomUsers[socket.roomId]).find(u => u.id === socket.uuid);
			if (!user || !['admin', 'super', 'developer'].includes(user.role)) throw new Error('Permission denied');
			const poll = await createPoll(question, options, user.username);
			socket.to('polls').emit('newPoll', poll);
			await trackUserActivity(user.username, 'Created a poll');
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handle the 'votePoll' event for polls tab.
	 * @param {Object} param - The poll vote data.
	 * @param {string} param.pollId - The poll ID.
	 * @param {string} param.optionId - The option ID.
	 */
	socket.on('votePoll', async ({ pollId, optionId }) => {
		try {
			if (!validateParams({ pollId, optionId }, { pollId: validateUUID, optionId: validateUUID })) throw new Error('Permission denied');
			const user = Array.from(roomData.roomUsers[socket.roomId]).find(u => u.id === socket.uuid);
			if (!user) throw new Error('Permission denied');
			const poll = await votePoll(pollId, optionId, user.username);
			socket.to('polls').emit('pollUpdate', poll);
			await trackUserActivity(user.username, `Voted in poll ${pollId}`);
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handle the 'createClip' event.
	 * @param {Object} param - The clip data.
	 * @param {string} param.stream - The stream data.
	 * @param {string} param.startTime - The clip start time.
	 * @param {string} param.endTime - The clip end time.
	 */
	socket.on('createClip', async ({ stream, startTime, endTime }) => {
		try {
			console.log('Stream Data Check:', stream);
			const streamId = stream.id;
			if (!validateParams({ 
				streamId, 
				startTime, 
				endTime 
			}, { 
				streamId: validateUUID, 
				startTime: validateTimestamp, 
				endTime: validateTimestamp 
			}) || !validateTimestamp(startTime) || !validateTimestamp(endTime)) throw new Error('Permission denied');
			const user = Array.from(roomData.roomUsers[socket.roomId]).find(u => u.id === socket.uuid);
			if (!user) throw new Error('Permission denied');
			const clip = await createClip(streamId, startTime, endTime); 
			socket.to('clips').emit('newClip', clip);
			await trackUserActivity(user.username, `Created a clip for stream ${streamId}`);
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handle the 'shareFile' event.
	 * @param {Object} param - The file sharing data.
	 * @param {string} param.roomId - The room ID.
	 * @param {Object} param.file - The file to share.
	 */
	socket.on('shareFile', async ({ roomId = socket.roomId, file }) => {
		try {
			if (!validateParams({ roomId }, { roomId: validateAlphanumeric }) || !roomData.roomUsers[roomId]) throw new Error('Permission denied');
			const user = Array.from(roomData.roomUsers[socket.roomId]).find(u => u.id === socket.uuid);
			if (!user) throw new Error('Permission denied');
			await shareFile(roomId, file);
			socket.to(roomId).emit('fileShared', { file, username: user.username });
			await trackUserActivity(user.username, `Shared a file in room ${roomId}`);
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handle the 'addReaction' event.
	 * @param {Object} param - The reaction data.
	 * @param {string} param.messageId - The message ID.
	 * @param {string} param.emoji - The emoji reaction.
	 */
	socket.on('addReaction', async ({ messageId, emoji }) => {
		try {
			const user = Array.from(roomData.roomUsers[socket.roomId]).find(u => u.id === socket.uuid);
			if (!user) throw new Error('User not found');
			await addReaction(messageId, emoji);
			socket.to(socket.roomId).emit('reactionAdded', { messageId, emoji, username: user.username });
			await trackUserActivity(user.username, `Reacted to message ${messageId} with ${emoji}`);
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});
	
	/** Handle the 'followUser' event.
	 * @param {Object} param - The follow user data.
	 * @param {string} param.id - The username of the user to follow.
	 */
	socket.on('followUser', async ({ id }) => {
		try {
			if (!validateParams({ id }, { id: validateAlphanumeric })) throw new Error('Permission denied');
			const roomId = socket.roomId;
			const user = Array.from(roomData.roomUsers[roomId]).find(user => user.id === id);
			if (!user) throw new Error('User not found in the room');
			await followUser(socket.uuid, user.username);
			const targetSocket = Array.from(socket.nsp.sockets.values()).find(s => s.uuid === user.id);
			if (targetSocket !== socket) {
				targetSocket.emit('following', { from: socket.uuid, fromUsername: socket.username });
				socket.emit('following', { to: user.id, username: user.username });
			}
			await trackUserActivity(socket.username, `Followed user ${user.username}`);
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handle the 'unfollowUser' event.
	 * @param {Object} param - The unfollow user data.
	 * @param {string} param.id - The username of the user to unfollow.
	 */
	socket.on('unfollowUser', async ({ id }) => {
		try {
			if (!validateParams({ id }, { id: validateAlphanumeric })) throw new Error('Permission denied');
			const roomId = socket.roomId;
			const user = Array.from(roomData.roomUsers[roomId]).find(user => user.id === id);
			if (!user) throw new Error('User not found in the room');
			await unfollowUser(socket.uuid, user.username);
			await trackUserActivity(socket.username, `Unfollowed user ${user.username}`);
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handle the 'followStream' event.
	 * @param {Object} param - The follow stream data.
	 * @param {string} param.stream - The stream data.
	 */
	socket.on('followStream', async ({ stream }) => {
		try {
			if (!validateParams(stream.id, validateUUID)) throw new Error('Permission denied');
			const user = Array.from(roomData.roomUsers[socket.roomId]).find(u => u.id === socket.uuid);
			if (!user) throw new Error('You are not logged in to complete this action');
			await followStream(user.id, stream.id, socket.roomId);
			socket.emit('streamFollowed', { streamId: stream.uuid });
			await trackUserActivity(user.username, `Followed stream ${stream.uuid}`);
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handle the 'unfollowStream' event.
	 * @param {Object} param - The unfollow stream data.
	 * @param {string} param.stream - The stream data.
	 */
	socket.on('unfollowStream', async ({ stream }) => {
		try {
			if (!validateParams(stream.id, validateUUID)) throw new Error('Permission denied');
			const user = Array.from(roomData.roomUsers[socket.roomId]).find(u => u.id === socket.uuid);
			if (!user) throw new Error('You are not logged in to complete this action');
			await unfollowStream(user.id, stream.id, socket.roomId);
			socket.emit('streamUnfollowed', { streamId: stream.uuid });
			await trackUserActivity(user.username, `Unfollowed stream ${stream.uuid}`);
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});
	
	
	/** Handle the 'suspendUser' event.
	 * @param {Object} data - The suspend user data.
	 * @param {string} userId - The user ID.
	 */
	socket.on('suspendUser', async ({ userId }) => {
		try {
			if (!validateParams({ userId }, { userId: validateUUID })) throw new Error('Permission denied');
			const admin = Array.from(roomData.roomUsers[socket.roomId]).find(u => u.id === socket.uuid);
			if (!admin || admin.id === userId || admin.role !== 'developer') throw new Error('Permission denied');
			const userSocket = Array.from(socket.nsp.sockets.values()).find(s => s.uuid === userId);
			if (userSocket) stopBroadcasting(userSocket);
			await suspendUser(userId, socket.uuid);
			const user = findUserById(userId);
			if (!user) await endStream(user.uuid);
			socket.emit('userSuspended', { userId: userId });
			await trackUserActivity(userId, 'Was suspended');
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});
	
	/** Check room permissions for kicking a user.
	 * @param {Object} data - The data containing user information.
	 * @param {string} userId - The ID of the user to be kicked.
	 * @returns {Object|false} - The admin user object if permission is granted, otherwise false.
	 */
	const roomPermissions = async ({ userId }) => {
		try {
			if (!validateParams({ userId }, { userId: validateUUID })) throw new Error('Permission denied');
			const admin = Array.from(roomData.roomUsers[socket.roomId]).find(u => u.id === socket.uuid);
			if (!admin || admin.id === userId || !['moderator', 'admin', 'super', 'owner'].includes(admin.role)) throw new Error('Permission denied');
			const adminRole = admin.role === 'owner' ? 'owner' : await findUserById(admin.id).then(u => u.role);
			const user = Array.from(roomData.roomUsers[socket.roomId]).find(u => u.id === userId);
			const userRole = user ? user.role : await findUserById(userId).then(u => u.role);
			const roleHierarchy = ['developer', 'owner', 'super', 'admin', 'moderator'];
			if (roleHierarchy.indexOf(adminRole) < 0 || roleHierarchy.indexOf(userRole) < 0) throw new Error('Invalid roles');
			if (roleHierarchy.indexOf(adminRole) >= roleHierarchy.indexOf(userRole)) throw new Error('Cannot kick user with higher or equal role');
			return admin || false;
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
			return false;
		}
	};

	/** Handle the 'kickUser' event.
	 * @param {Object} param - The kick user data.
	 * @param {string} userId - The user ID.
	 */
	socket.on('kickUser', async ({ userId } ) => {
		try {
			const admin = await roomPermissions(userId);
			if (!admin) throw new Error('Permission denied');
			const userSocket = Array.from(socket.nsp.sockets.values()).find(s => s.uuid === userId);
			if (userSocket) {
				await stopBroadcasting(userSocket);
				await endStream(userSocket.uuid);
				userSocket.leave(socket.roomId);
				socket.to(socket.roomId).emit('message', { user: 'System', text: `User ${userId} was kicked from the room by ${admin.username}` });
				await trackUserActivity(userId, `Was kicked from room ${socket.roomId}`);
			} else throw new Error('User not found.');
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handle the 'banUser' event.
	 * @param {Object} data - The ban user data.
	 * @param {string} userId - The user ID.
	 */
	socket.on('banUser', async ({ userId }) => {
		try {
			const admin = await roomPermissions(userId);
			if (!admin) throw new Error('Permission denied');
			const userSocket = Array.from(socket.nsp.sockets.values()).find(s => s.uuid === userId);
			if (userSocket) {
				await stopBroadcasting(userSocket);
				await endStream(userSocket.uuid);
				if (socket.roomsAccess[socket.roomId]) delete socket.roomsAccess[socket.roomId];
				userSocket.leave(socket.roomId);
				socket.to(socket.roomId).emit('message', { user: 'System', text: `User ${userId} was banned from the room by ${admin.username}` });
				await trackUserActivity(userId, `Was banned from room ${socket.roomId}`);
			} else throw new Error('User not found.');
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handle the 'shadowBanUser' event.
	 * @param {Object} data - The shadow ban user data.
	 * @param {string} userId - The user ID.
	 */
	socket.on('shadowBanUser', async ({ userId }) => {
		try {
			const admin = await roomPermissions(userId);
			if (!admin) throw new Error('Permission denied');
			const userSocket = Array.from(socket.nsp.sockets.values()).find(s => s.uuid === userId);
			if (userSocket) {
				await shadowBanUser(userId, socket.uuid);
				await stopBroadcasting(userSocket);
				await endStream(userSocket.uuid);
				userSocket.leave(socket.roomId);
				await trackUserActivity(userId, `Was shadow banned from room ${socket.roomId}`);
			} else throw new Error('User not found.');
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handle the 'muteUser' event.
	 * @param {Object} param - The mute user data.
	 * @param {string} muted - The true or false if user muted.
	 * @param {string} userId - The user ID.
	 * @param {string} timeOut - The user timed out custom or default.
	 */
	socket.on('muted', async ({ userId, muted, timeOut = 300000 }) => {
		try {
			const admin = Array.from(roomData.roomUsers[socket.roomId]).find(u => u.id === socket.uuid);
			if (!admin || !['moderator', 'admin', 'super', 'developer'].includes(admin.role)) throw new Error('Permission denied');
			if (!validateParams({ userId }, { userId: validateUUID })) throw new Error('Permission denied');
			const user = Array.from(roomData.roomUsers[socket.roomId]).find(u => u.id === userId);
			if (user) {
				if (muted) {
					await muteUserInRoom(socket.roomId, userId, admin.id);
					socket.to(socket.roomId).emit('muted', { muted: true, userId, userTarget: user.username, username: socket.username });
					await trackUserActivity(userId, `Was muted in room ${socket.roomId}`);
					if (roomData.roomUsers[socket.roomId].mutedUsers[userId]) clearTimeout(roomData.roomUsers[socket.roomId].mutedUsers[userId]);
					roomData.roomUsers[socket.roomId].mutedUsers[userId] = setTimeout(async () => {
						await unmuteUserInRoom(socket.roomId, userId, admin.id);
						await trackUserActivity(userId, `Was auto unmuted in room ${socket.roomId}`);
						socket.to(socket.roomId).emit('muted', { muted: false, userId, userTarget: user.username, username: socket.username, timeOut: timeOut });
					}, timeOut);
				} else {
					await unmuteUserInRoom(socket.roomId, userId, admin.id);
					socket.to(socket.roomId).emit('muted', { muted: false, userId, userTarget: user.username, username: socket.username });
					await trackUserActivity(userId, `Was unmuted in room ${socket.roomId}`);
					if (roomData.roomUsers[socket.roomId].mutedUsers[userId]) {
						clearTimeout(roomData.roomUsers[socket.roomId].mutedUsers[userId]);
						delete roomData.roomUsers[socket.roomId].mutedUsers[userId];
					}
				}
			}
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});
	
	/** Handle the 'blockUser' event.
	 * @param {Object} param - The block user data.
	 * @param {string} param.id - The username of the user to block.
	 */
	socket.on('blockUser', async ({ id }) => {
		try {
			const roomId = socket.roomId;
			if (!validateParams({ id }, { id: validateAlphanumeric })) throw new Error('Permission denied');
			const user = Array.from(roomData.roomUsers[roomId]).find(user => user.id === id);
			if (!user) throw new Error('User not found in the room');
			await blockUser(socket.uuid, user.username, socket.roomId);
			socket.to(roomId).emit('blocked', { to: user.id, username: user.username });
			await trackUserActivity(socket.username, `Blocked user ${user.username}`);
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handle the 'unblockUser' event.
	 * @param {Object} param - The unblock user data.
	 * @param {string} param.id - The username of the user to unblock.
	 */
	socket.on('unblockUser', async ({ id }) => {
		try {
			const roomId = socket.roomId;
			if (!validateParams({ id }, { id: validateAlphanumeric })) throw new Error('Permission denied');
			const user = Array.from(roomData.roomUsers[roomId]).find(user => user.id === id);
			if (!user) throw new Error('User not found in the room');
			await unblockUser(socket.uuid, user.username);
			socket.to(roomId).emit('unblocked', { to: user.id, username: user.username });
			await trackUserActivity(socket.username, `Unblocked user ${user.username}`);
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handle the 'rateLimitedMessage' event.
	 * @param {Object} param - The rate limited message data.
	 * @param {string} param.roomId - The room ID.
	 * @param {string} param.message - The message.
	 */
	socket.on('rateLimitedMessage', async ({ roomId = socket.roomId, message }) => {
		try {
			message = sanitizeMessage(message);
			if (!validateParams({ roomId }, { roomId: validateAlphanumeric }) || !roomData.roomUsers[roomId]) throw new Error('Permission denied');
			const isAllowed = await checkRateLimit(socket.id);
			if (isAllowed) {
				socket.to(roomId).emit('message', message);
				archiveMessage(roomId, message);
			} else socket.emit('rateLimitExceeded');
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handle the 'changeUserRole' event.
	 * @param {Object} param - The change user role data.
	 * @param {string} param.userId - The user ID.
	 * @param {string} param.role - The new role.
	 * @param {string} param.roomId - The room ID.
	 */
	socket.on('changeUserRole', async ({ userId, role, roomId = socket.roomId }) => {
		try {
			if (!validateParams({ userId, role, roomId }, { userId: validateUUID, role: validateAlphanumeric, roomId: validateAlphanumeric }) || !roomData.roomUsers[roomId]) throw new Error('Permission denied');
			const admin = Array.from(roomData.roomUsers[roomId]).find(({ id }) => id === socket.uuid);
				if (!admin || !['admin', 'super', 'developer'].includes(admin.role) || !hasRole(admin, role)) throw new Error('Permission denied');
			await changeUserRole(admin.id, userId, role, roomId);
			socket.to(roomId).emit('userRoleChanged', { userId, role });
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});			

	/** Handle the 'createRole' event.
	 * @param {Object} param - The create role data.
	 * @param {string} param.roomId - The room ID.
	 * @param {string} param.roleName - The role name.
	 * @param {Array} param.permissions - The role permissions.
	 * @param {Object} param.settings - Settings for the role (e.g., colors).
	 */
	socket.on('createRole', async ({ roomId = socket.roomId, roleName, permissions, settings }) => {
		try {
			if (!validateParams({ roomId, roleName }, { roomId: validateAlphanumeric, roleName: validateAlphanumeric }) || !roomData.roomUsers[roomId]) throw new Error('Permission denied');
			const admin = Array.from(roomData.roomUsers[roomId]).find(({ id }) => id === socket.uuid);
			if (!admin?.role || !['admin', 'super', 'developer'].includes(admin.role)) throw new Error('Permission denied');
			if (hasRole(admin, roleName)) {
				await createRole(roomId, roleName, permissions, settings, admin.id);
				socket.to(roomId).emit('roleCreated', { roomId, roleName, permissions, settings });
			}
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});	

	/** Handle the 'deleteRole' event.
	 * @param {Object} param - The delete role data.
	 * @param {string} param.roomId - The room ID.
	 * @param {string} param.roleName - The role name.
	 */
	socket.on('deleteRole', async ({ roomId = socket.roomId, roleName }) => {
		try {
			if (!validateParams({ roomId, roleName }, { roomId: validateAlphanumeric, roleName: validateAlphanumeric }) || !roomData.roomUsers[roomId]) throw new Error('Permission denied');
			const admin = Array.from(roomData.roomUsers[roomId]).find(({ id }) => id === socket.uuid);
			if (!admin || !['admin', 'super', 'developer'].includes(admin.role)) throw new Error('Permission denied');
			if (hasRole(admin, roleName)) {
				await deleteRole(roomId, roleName, admin.id);
				socket.to(roomId).emit('roleDeleted', { roomId, roleName });
			}
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});	

	/** Handle the 'assignRole' event.
	 * @param {Object} param - The assign role data.
	 * @param {string} param.userId - The user ID to assign the role to.
	 * @param {string} param.role - The role to assign.
	 * @param {string} param.roomId - The room ID.
	 */
	socket.on('assignRole', async ({ userId, role, roomId = socket.roomId }) => {
		try {
			if (!validateParams({ userId, roomId, role }, { userId: validateUUID, roomId: validateAlphanumeric, role: validateAlphanumeric }) || !roomData.roomUsers[roomId]) throw new Error('Permission denied');
			const admin = Array.from(roomData.roomUsers[roomId]).find(u => u.id === socket.uuid);
			if (!admin || !['admin', 'super', 'developer'].includes(admin.role) || !hasRole(admin, role)) throw new Error('Permission denied');
			await assignRole(admin.id, userId, role, roomId);
			socket.to(roomId).emit('roleAssigned', { userId, role, roomId });
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});	

	/** Handle the 'removeRole' event.
	 * @param {Object} param - The remove role data.
	 * @param {string} param.userId - The user ID to remove the role from.
	 * @param {string} param.role - The role to remove.
	 * @param {string} param.roomId - The room ID.
	 */
	socket.on('removeRole', async ({ userId, role, roomId = socket.roomId }) => {
		try {
			if (!validateParams({ userId, roomId, role }, { userId: validateUUID, roomId: validateAlphanumeric, role: validateAlphanumeric }) || !roomData.roomUsers[roomId]) throw new Error('Permission denied');
			const admin = Array.from(roomData.roomUsers[roomId]).find(u => u.id === socket.uuid);
			if (!admin || !['admin', 'super', 'developer'].includes(admin.role) || !hasRole(admin, role)) throw new Error('Permission denied');
			await removeRole(admin.id, userId, role, roomId);
			socket.to(roomId).emit('roleRemoved', { userId, role, roomId });
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handle the 'confirmOwnershipTransfer' event.
	 * @param {Object} param - The ownership transfer data.
	 * @param {string} param.currentOwnerId - The ID of the current owner.
	 * @param {string} param.newOwnerId - The ID of the new owner.
	 * @param {string} param.roomId - The room ID.
	 */
	socket.on('confirmOwnershipTransfer', async ({ currentOwnerId, newOwnerId, roomId = socket.roomId }) => {
		try {
			if (!validateParams({ currentOwnerId, newOwnerId, roomId }, { currentOwnerId: validateUUID, newOwnerId: validateUUID, roomId: validateAlphanumeric }) || !roomData.roomUsers[roomId]) throw new Error('Permission denied');
			const currentOwner = Array.from(roomData.roomUsers[roomId]).find(({ id }) => id === currentOwnerId && id === socket.uuid);
			if (!currentOwner) throw new Error('Permission denied');
			await confirmOwnershipTransfer(currentOwnerId, newOwnerId, roomId);
			const transferData = { currentOwnerId, newOwnerId, roomId };
			socket.to(roomId).emit('ownershipTransferred', transferData);
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});	

	/** Handle the 'updateNonCriticalSettings' event.
	 * @param {Object} param - The update settings data.
	 * @param {string} param.roomId - The room ID.
	 * @param {Object} param.settings - The new settings to update.
	 */
	socket.on('updateNonCriticalSettings', async ({ roomId = socket.roomId, settings }) => {
		try {
			if (!validateParams({ roomId }, { roomId: validateAlphanumeric }) || !roomData.roomUsers[roomId]) throw new Error('Permission denied');
			const user = Array.from(roomData.roomUsers[roomId]).find(u => u.id === socket.uuid);
			if (!user?.role || !['admin', 'super', 'developer'].includes(user.role)) throw new Error('Permission denied');
			await updateNonCriticalSettings(roomId, settings, user.id);
			const updatePayload = { roomId, settings };
			socket.to(roomId).emit('settingsUpdated', updatePayload);
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});
	

	/** Handle the 'customEvent' event.
	 * @param {Object} param - The custom event data.
	 * @param {string} param.event - The event name.
	 * @param {Object} param.data - The event data.
	 */
	socket.on('customEvent', ({ event, data }) => {
		socket.emit('customEvent', { event, data });
	});

	/** Handle the 'inviteUser' event.
	 * @param {Object} param - The invite user data.
	 * @param {string} param.userId - The user ID.
	 * @param {string} param.roomId - The room ID.
	 */
	socket.on('inviteUser', ({ userId, roomId = socket.roomId }) => {
		try {
			if (!validateParams({ userId, roomId }, { userId: validateUUID, roomId: validateAlphanumeric }) || !roomData.roomUsers[roomId]) throw new Error('Permission denied');
			const userSocket = Array.from(socket.nsp.sockets.values()).find(s => s.uuid === userId);
			if (userSocket) userSocket.emit('roomInvite', { roomId });
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handle the 'trackUserActivity' event.
	 * @param {Object} param - The user activity data.
	 * @param {string} param.activity - The activity to track.
	 */
	socket.on('trackUserActivity', async ({ activity }) => {
		try {
			await trackUserActivity(socket.id, activity);
		} catch (error) {
			logError(error);
		}
	});

	/** Handle the 'switchTheme' event.
	 * @param {Object} param - The theme data.
	 * @param {string} param.theme - The new theme.
	 */
	socket.on('switchTheme', async ({ theme }) => { //create switchTheme function to handle custom room themes
		try {
			const user = Array.from(roomData.roomUsers[socket.roomId]).find(u => u.id === socket.uuid);
			const room = checkRoom(socket.roomId.toLowerCase());
			if (!user) throw new Error('User not found');
			if (room.owner !== user.id && user.role !== 'developer') throw new Error('Permission denied');
			await switchTheme(room, theme);
			socket.to(socket.roomId).emit('themeSwitched', { theme });
			await trackUserActivity(user.username, 'Switched theme');
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handle the 'startRecording' event.
	 * @param {Object} param - The start recording data.
	 * @param {string} param.stream - The stream data.
	 */
	socket.on('startRecording', async ({ stream }) => {
		try {
			if (!validateParams(stream.id, validateUUID)) throw new Error('Permission denied');
			const user = Array.from(roomData.roomUsers[socket.roomId]).find(u => u.id === socket.uuid);
			if (!user || !['admin', 'super', 'developer'].includes(user.role)) throw new Error('Permission denied');
			await startRecording(stream.id);
			socket.emit('recordingStarted', { streamId: stream.uuid });
			await trackUserActivity(user.username, `Started recording for stream ${stream.uuid}`);
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handle the 'stopRecording' event.
	 * @param {Object} param - The stop recording data.
	 * @param {string} param.stream - The stream data.
	 */
	socket.on('stopRecording', async ({ stream }) => {
		try {
			if (!validateParams(stream.id, validateUUID)) throw new Error('Permission denied');
			const user = Array.from(roomData.roomUsers[socket.roomId]).find(u => u.id === socket.uuid);
			if (!user || !['admin', 'super', 'developer'].includes(user.role)) throw new Error('Permission denied');
			await stopRecording(stream.id);
			socket.emit('recordingStopped', { streamId: stream.uuid });
			await trackUserActivity(user.username, `Stopped recording for stream ${stream.uuid}`);
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handle the 'enable2FA' event.
	 */
	socket.on('enable2FA', async () => {
		try {
			const user = Array.from(roomData.roomUsers[socket.roomId]).find(u => u.id === socket.uuid);
			if (!user) throw new Error('Permission denied');
			await enable2FA(user.id);
			socket.emit('2FAEnabled', { userId: user.id });
			await trackUserActivity(user.username, 'Enabled 2FA');
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handle the 'disable2FA' event.
	 */
	socket.on('disable2FA', async () => {
		try {
			const user = Array.from(roomData.roomUsers[socket.roomId]).find(u => u.id === socket.uuid);
			if (!user) throw new Error('Permission denied');
			await disable2FA(user.id);
			socket.emit('2FADisabled', { userId: user.id });
			await trackUserActivity(user.username, 'Disabled 2FA');
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handle the 'inviteToGame' event to invite a user to a game.
	 * @param {Object} data - The data associated with the game invitation.
	 * @param {string} data.recipientId - The ID of the user to invite.
	 * @param {Object} data.gameDetails - Details about the game being played.
	 */
	socket.on('inviteToGame', async (data) => {
		try {
			const { recipientId, gameDetails } = data;
			if (!validateParams({ recipientId  }, { recipientId: validateUUID })) {
				throw new Error('Permission denied');
			}
			if(!gameData.acceptedGames.includes(gameDetails)) {
				await trackUserActivity(socket.username, 'Game choice is disabled');
				throw new Error('Game choice is disabled');
			}
			const recipient = await verifyUserEnabledGames(recipientId);
			if (!recipient) {
				await trackUserActivity(socket.username, `Invited user has games disabled: ${recipient.username}`);
				throw new Error('Users games disabled');
			}
			const isFound = findUserById(socket.id);
			if (!isFound) {
				await trackUserActivity(socket.username, `Attempted invite not member: ${socket.id}`);
				throw new Error('Please log in, Invalid invatation');
			}
			 if (gameData.gameInstances[socket.roomId] && gameData.gameInstances[socket.roomId].type === gameDetails) {
				await trackUserActivity(socket.username, 'Game already in progress in this room.');
				throw new Error('Game already in progress in this room.');
			}
			gameData.pendingInvitations[recipientId] = {
				inviterId: socket.id,
				gameDetails,
				roomId: socket.roomId
			};
			socket.to(recipientId).emit('gameInvitation', { from: socket.id, gameDetails });
			await trackUserActivity(socket.username, `Invite to game received: ${isFound.username} - ${gameDetails}`);
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});


	/** Handle the 'acceptGameInvitation' event when a user accepts a game invitation.
	 * @param {Object} data - The data associated with the acceptance.
	 * @param {string} data.inviterId - The ID of the user who sent the invitation.
	 * @param {Object} data.gameDetails - Details about the game being played.
	 */
	socket.on('acceptGameInvitation', async (data) => {
		try {
			const { inviterId, gameDetails } = data;
			if (!validateParams({ inviterId  }, { inviterId: validateUUID })) {
				throw new Error('Permission denied');
			}
			const invitation = gameData.pendingInvitations[socket.id];
			if (!invitation || invitation.inviterId !== inviterId || invitation.gameDetails !== gameDetails) {
				await trackUserActivity(socket.username, 'Invalid or expired game invitation.');
				throw new Error('Invalid or expired invitation.');
			}
			if(!gameData.acceptedGames.includes(gameDetails)) {
				await trackUserActivity(socket.username, 'Game choice is disabled');
				throw new Error('Game choice is disabled');
			}
			const inviter = await verifyUserEnabledGames(inviterId);
			if (!inviter) {
				await trackUserActivity(socket.username, `Games no longer valid from: ${inviter.username} they are disabled`);
				throw new Error('Invitation no longer valid games are disabled with ${inviter.username} ');
			}
			const isFound = findUserById(socket.id);
			if (!isFound) {
				await trackUserActivity(socket.username, `Attempted invite not member: ${socket.id}`);
				throw new Error('Please log in, Invalid invatation');
			}
			if (!gameData.gameInstances[invitation.roomId]) {
				createGameInstance(gameDetails, invitation.roomId, socket.id);
			}
			const participants = gameData.gameParticipants[invitation.roomId] || {};
			participants[inviterId].opponentId = socket.id;
			participants[socket.id] = {
				opponentId: inviterId,
				spectators: []
			};
			gameData.gameParticipants[invitation.roomId] = participants;
			const host = socket.handshake.headers.host;
			const baseDomain = getBaseDomain(host);
			const gameUrl = `//${baseDomain}/games/${gameDetails}/${invitation.roomId}`;
			socket.emit('newWindowToGame', { url: gameUrl });
			io.to(inviterId).emit('newWindowToGame', { url: gameUrl });
			const gameSocket = io.of('/games').connected[socket.id] || io.of('/games').connect(socket.id);
			setupGameHandlers(gameSocket);
			delete gameData.pendingInvitations[socket.id];
			delete gameData.pendingInvitations[inviterId];
			/*
			//socket.leave('/chat');
			//socket.disconnect(true);
			socket.emit('newWindowToGame', { url: `/games/${gameDetails}/${socket.roomId}` });
			const gameSocket = namespaces.games.connected[socket.id] || namespaces.games.connect(socket.id);
			setupGameHandlers(gameSocket);
			//namespaces.games.to(inviterId).emit('invitationAccepted', { from: socket.id, gameDetails });
			gameSocket.emit('newWindowToGame', { url: `/games/${gameDetails}/${socket.roomId}` });
			delete gameData.pendingInvitations[socket.id];
			delete gameData.pendingInvitations[inviterId];
			*/
			await trackUserActivity(socket.username, `Game invitation accepted: ${socket.username} from: ${inviter.username}`);
		} catch (error) {
			logError(error);
			socket.emit('error', { message: error.message, timestamp: Date.now() });
		}
	});

	/** Handles the donation of credits by a user to a specific room. It validates the amount provided
	 * @param {Object} data - Contains information about the credit donation.
	 * @param {number} data.amount - The amount of credits the user wants to donate.
	 */
	socket.on('creditRoom', (data) => {
		if (!isDigit(data.amount)) return socket.emit('error', { message: 'Invalid amount format.' });
		//const user = findUserById(socket.uuid);
		const user = findUserByUsername(socket.username);
		if (!user) return socket.emit('error', { message: 'User not found.' });
		if (data.amount <= user.credits.amount) {
			processRoomDonation(socket.uuid, { donationAmount: data.amount, roomId: socket.roomId })
				.then(() => {
					socket.emit('creditedRoom', { amount: data.amount });
				})
				.catch((error) => {
					socket.emit('error', { message: 'Failed to process donation.', details: error.message });
				});
		} else socket.emit('error', { message: 'Insufficient credits.' });
	});
	
};

module.exports = {
	setupWebSocket,
	handleStreamer,
	handleStartBroadcast,
	loadExistingStreamer,
	stopBroadcasting,
	handlePushToTalk,
	handlePauseResumeStream
};