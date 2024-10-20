/*  ██╗██╗                                                                                           ██╗██╗
 *  ██║╚═╝  ███████╗████████╗██╗ ██████╗██╗  ██╗██████╗ ███╗   ███╗     ██████╗ ██████╗ ███╗   ███╗  ╚═╝██║
 *  ██║     ██╔════╝╚══██╔══╝██║██╔════╝██║ ██╔╝██╔══██╗████╗ ████║    ██╔════╝██╔═══██╗████╗ ████║     ██║
 *  ██║     ███████╗   ██║   ██║██║     █████╔╝ ██████╔╝██╔████╔██║    ██║     ██║   ██║██╔████╔██║     ██║
 *  ██║     ╚════██║   ██║   ██║██║     ██╔═██╗ ██╔═══╝ ██║╚██╔╝██║    ██║     ██║   ██║██║╚██╔╝██║     ██║
 *  ██║     ███████║   ██║   ██║╚██████╗██║  ██╗██║     ██║ ╚═╝ ██║ ██╗╚██████╗╚██████╔╝██║ ╚═╝ ██║     ██║
 *  ██║██╗  ╚══════╝   ╚═╝   ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝     ╚═╝ ╚═╝ ╚═════╝ ╚═════╝ ╚═╝     ╚═╝  ██╗██║
 *  ╚═╝╚═╝                                                                                           ╚═╝╚═╝
 * StickPM Project
 * © 2024 BadNintendo
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
 *    not claim that you wrote the original software.
 * 2. Altered source versions must be plainly marked as such, and must
 *    not be misrepresented as being the original software.
 * 3. This notice may not be removed or altered from any source
 *    distribution.
 * 
 * CONTEXT:
 * This module, `webrtc-server`, provides functionalities for handling WebRTC communication within the StickPM project.
 * 1. QPRx2025 Initialization: Initializes the QPRx2025 library with the current timestamp to seed the random number generator.
 * 2. Encryption/Decryption Functions:
 *    - `encryptSDP(sdp)`: Encrypts the provided SDP string using XOR encryption with a generated key and IV.
 *    - `decryptSDP(encryptedSDP)`: Decrypts the given encrypted SDP string using XOR decryption.
 * 3. SDP Manipulation:
 *    - `setPreferredCodec(sdp, codecName)`: Modifies the SDP string to set the specified codec as preferred.
 * 4. Room Management:
 *    - `generateRoomId()`: Generates a unique room ID using a UUID generator.
 * 5. Custom Classes:
 *    - `RTCEventTarget`: Extends Node.js's `EventEmitter` to handle RTC events.
 *    - `RTCDataChannel`: Wraps around `wrtc.RTCDataChannel`, adding event handling for data channels.
 *    - `RTCIceCandidate`: Represents an ICE candidate and includes a method for sanitizing candidate strings.
 *    - `RTCSessionDescription`: Represents a session description for an RTC connection.
 *    - `SFUManager`: Manages participants and their streams in an SFU (Selective Forwarding Unit) scenario, handling stream broadcasting, codec management, and network condition monitoring.
 *    - `RTCPeerConnection`: Manages WebRTC peer-to-peer connections, handling SDP offers/answers, ICE candidates, media streams, and integrating SFU functionalities.
 * 6. Media Devices Interface:
 *    - Provides methods for accessing media devices, including `getDisplayMedia`, `getUserMedia`, and constraints validation.
 * 7. Non-standard WebRTC Features:
 *    - Includes utility functions and classes provided by the 'wrtc' library for media handling, such as `i420ToRgba`, `RTCVideoSink`, and `RTCAudioSource`.
 * Module exports:
 * - Classes: `RTCDataChannel`, `RTCIceCandidate`, `RTCSessionDescription`, `RTCPeerConnection`
 * - Objects: `mediaDevices`, `nonstandard`
 * - Functions: `encryptSDP`, `decryptSDP`, `setPreferredCodec`, `generateRoomId`
 */

const { EventEmitter } = require('events');
const QPRx2025 = require('./QPRx2025');
const wrtc = require('wrtc');

/**
 * Initialize QPRx2025 with the current timestamp for random number generation.
 * - This setup ensures the random number generator is properly seeded.
 * @function
 */
QPRx2025.init(Date.now());

// Set encryption key length and IV length using environment variables or default values
const ENCRYPTION_KEY_LENGTH = parseInt(process.env.ENCRYPTION_KEY_LENGTH, 10) || 32;
const IV_LENGTH = parseInt(process.env.IV_LENGTH, 10) || 16;

/**
 * Encrypts the given SDP string using XOR encryption with a generated key and IV.
 * @param {string} sdp - The Session Description Protocol (SDP) string to be encrypted.
 * @returns {string} Encrypted SDP as a string in the format: "key:iv:encryptedData".
 */
const encryptSDP = (sdp) => {const key = QPRx2025.generateCharacters(ENCRYPTION_KEY_LENGTH);
	const iv = QPRx2025.generateCharacters(IV_LENGTH);
	let encrypted = '';
	for (let i = 0; i < sdp.length; i++) {
		encrypted += String.fromCharCode(sdp.charCodeAt(i) ^ key.charCodeAt(i % key.length));
	}
	return [key, iv, encrypted].join(':');
};

/**
 * Decrypts the given encrypted SDP string using XOR decryption.
 * @param {string} encryptedSDP - The encrypted SDP string in the format: "key:iv:encryptedData".
 * @returns {string} The decrypted SDP string.
 */
const decryptSDP = (encryptedSDP) => {
	const [key, iv, encrypted] = encryptedData.split(':');
	let decrypted = '';
	for (let i = 0; i < encrypted.length; i++) {
		decrypted += String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length));
	}
	return decrypted;
};

/**
 * Sets the preferred codec in the given SDP string by modifying the m=video line.
 * @param {string} sdp - The SDP string to modify.
 * @param {string} codecName - The name of the codec to set as preferred.
 * @returns {string} The modified SDP string with the preferred codec.
 */
const setPreferredCodec = (sdp, codecName) => {
	const regex = new RegExp(`a=rtpmap:(\\d+) ${codecName}\\/`, 'i');
	const codecMatch = sdp.match(regex);
	if (!codecMatch) {
		console.warn(`No ${codecName} codec found in the SDP`);
		return sdp;
	}
	const codecId = codecMatch[1];
	const regex2 = new RegExp(`a=fmtp:${codecId} (.+)`, 'i');
	const fmtpMatch = sdp.match(regex2);
	const fmtpLine = (fmtpMatch && fmtpMatch[1]) || '';
	let rtpmapLine = `a=rtpmap:${codecId} ${codecName}`;
	if (fmtpLine) rtpmapLine += `\na=fmtp:${codecId} ${fmtpLine}`;
	return sdp.replace(/m=video .+\r\n/, `m=video ${rtpmapLine}\r\n`);
};

/**
 * Generates a unique room ID using a UUID generator.
 * @returns {string} A newly generated room ID.
 */
const generateRoomId = () => QPRx2025.generateUUID();

/**
 * Custom EventEmitter class for managing RTC events.
 */
class RTCEventTarget extends EventEmitter {}

/**
 * RTCDataChannel class that wraps around wrtc.RTCDataChannel and adds event handling.
 */
class RTCDataChannel extends RTCEventTarget {
	constructor(label, options) {
		super();
		this.label = label;
		this.options = options;
		this._dc = new wrtc.RTCDataChannel(label, options);
		this._dc.onopen = this._createEventHandler('open');
		this._dc.onclose = this._createEventHandler('close');
		this._dc.onerror = this._createEventHandler('error');
		this._dc.onmessage = this._createEventHandler('message');
	}
	_createEventHandler(eventType) {
		return (...args) => this.emit(eventType, ...args);
	}
	send(data) {
		this._dc.send(data);
	}
	close() {
		this._dc.close();
	}
}

/**
 * Class representing an ICE Candidate.
 */
class RTCIceCandidate {
	constructor(candidateInitDict) {
		const sanitizedCandidate = RTCIceCandidate.sanitizeCandidate(candidateInitDict.candidate);
		[
			'candidate', 'sdpMid', 'sdpMLineIndex', 'foundation', 'component', 'priority',
			'address', 'protocol', 'port', 'type', 'tcpType', 'relatedAddress', 'relatedPort', 'usernameFragment'
		].forEach(property => {
			this[property] = candidateInitDict[property] || null;
		});
		this.candidate = sanitizedCandidate;
	}
	static sanitizeCandidate(candidate) {
		if (!candidate) return '';
		return candidate.replace(/a=candidate:\d+ \d+ udp \d+ \d+\.\d+\.\d+\.\d+ \d+ typ host/g, '');
	}
}

/**
 * Class representing a session description for an RTC connection.
 */
class RTCSessionDescription {
	constructor({ type, sdp }) {
		this.type = type;
		this.sdp = this.sanitizeSDP(sdp);
	}
	sanitizeSDP(sdp) {
		return sdp.replace(/a=msid-semantic: WMS \r\n/g, '');
	}
}

/**
 * Manages participants and their streams in an SFU (Selective Forwarding Unit) scenario.
 * @extends RTCEventTarget
 */
class SFUManager extends RTCEventTarget {
	constructor() {
		super();
		this.participants = new Map();
		this.mixedStreams = new Map();
	}
	addParticipant(participantId, peerConnection) {
		this.participants.set(participantId, peerConnection);
		peerConnection.ontrack = (event) => this.handleTrack(participantId, event);
	}
	removeParticipant(participantId) {
		if (this.participants.has(participantId)) {
			this.participants.get(participantId).close();
			this.participants.delete(participantId);
		}
	}
	handleTrack(participantId, event) {
		const stream = event.streams[0];
		if (!this.mixedStreams.has(stream.id)) {
			const mixedStream = new wrtc.MediaStream();
			this.mixedStreams.set(stream.id, mixedStream);
		}
		const mixedStream = this.mixedStreams.get(stream.id);
		mixedStream.addTrack(event.track);

		this.participants.forEach((pc, id) => {
			if (id !== participantId) {
				pc.addTrack(event.track, mixedStream);
			}
		});
	}
	broadcastStream(stream) {
		this.participants.forEach((pc) => {
			stream.getTracks().forEach((track) => {
				pc.addTrack(track, stream);
			});
		});
	}
	enableSimulcast(pc, track) {
		const sender = pc.addTrack(track);
		const params = sender.getParameters();
		if (!params.encodings) {
			params.encodings = [{}];
		}
		params.encodings = [
			{ rid: 'f', maxBitrate: 500000 },
			{ rid: 'h', maxBitrate: 200000, scaleResolutionDownBy: 2.0 },
			{ rid: 'q', maxBitrate: 100000, scaleResolutionDownBy: 4.0 }
		];
		sender.setParameters(params);
	}
	enableSVC(pc, track) {
		const sender = pc.addTrack(track);
		const params = sender.getParameters();
		if (!params.encodings) {
			params.encodings = [{}];
		}
		params.encodings[0].scalabilityMode = 'L3T3_KEY';
		sender.setParameters(params);
	}
	adjustBitrate(pc, availableBandwidth) {
		pc.getSenders().forEach((sender) => {
			const params = sender.getParameters();
			if (params.encodings) {
				params.encodings.forEach((encoding) => {
					encoding.maxBitrate = Math.min(availableBandwidth, encoding.maxBitrate || availableBandwidth);
				});
				sender.setParameters(params);
			}
		});
	}
	monitorNetworkConditions(pc) {
		setInterval(async () => {
			const stats = await pc.getStats();
			stats.forEach((report) => {
				if (report.type === 'outbound-rtp' && !report.isRemote) {
					const availableBandwidth = this.estimateAvailableBandwidth(report);
					this.adjustBitrate(pc, availableBandwidth);
				}
			});
		}, 5000);
	}
	estimateAvailableBandwidth(report) {
		const packetLossRate = report.packetsLost / report.packetsSent;
		const rtt = report.roundTripTime;
		const jitter = report.jitter;
		const throughput = (report.bytesSent * 8) / report.timestamp;
		let availableBandwidth = throughput;
		if (packetLossRate > 0.05) {
			availableBandwidth *= 0.75;
		}
		if (rtt > 300) {
			availableBandwidth *= 0.85;
		}
		if (jitter > 100) {
			availableBandwidth *= 0.9;
		}
		return availableBandwidth;
	}
}

/**
 * Manages the WebRTC peer-to-peer connections, handling SDP offers/answers, ICE candidates, and media streams.
 * @extends RTCEventTarget
 */
class RTCPeerConnection extends RTCEventTarget {
	constructor(config) {
		super();
		this._pc = new wrtc.RTCPeerConnection(config);
		this._sfuManager = new SFUManager();
		this._pc.ontrack = this._createEventHandler('track');
		this._pc.onicecandidate = this._createEventHandler('icecandidate');
		this._pc.onicecandidateerror = this._createIceCandidateErrorHandler();
		this._pc.onconnectionstatechange = this._createEventHandler('connectionstatechange');
		this._pc.onsignalingstatechange = this._createEventHandler('signalingstatechange');
		this._pc.oniceconnectionstatechange = this._createEventHandler('iceconnectionstatechange');
		this._pc.onicegatheringstatechange = this._createEventHandler('icegatheringstatechange');
		this._pc.onnegotiationneeded = this._createEventHandler('negotiationneeded');
		this._pc.ondatachannel = this._createEventHandler('datachannel');
	}
	_createEventHandler(eventType) {
		return (...args) => this.emit(eventType, ...args);
	}
	_createIceCandidateErrorHandler() {
		return (eventInitDict) => {
			const [address, port] = eventInitDict.hostCandidate.split(':');
			this.emit('icecandidateerror', { ...eventInitDict, address, port });
		};
	}
	async createOffer(options) {
		return await this._pc.createOffer(options);
	}
	async setLocalDescription(description) {
		return await this._pc.setLocalDescription(description);
	}
	async setRemoteDescription(description) {
		if (!description || !description.sdp || !description.type) {
			throw new Error('Invalid SDP or type');
		}
		let sanitizedSDP = description.sdp;
		if (!sanitizedSDP.includes('a=rtcp-mux')) {
			sanitizedSDP += '\na=rtcp-mux';
		}
		if (!sanitizedSDP.includes('a=rtcp-rsize')) {
			sanitizedSDP += '\na=rtcp-rsize';
		}
		description.sdp = sanitizedSDP;
		return await this._pc.setRemoteDescription(description);
	}
	async createAnswer(options) {
		return await this._pc.createAnswer(options);
	}
	async addIceCandidate(candidate) {
		return await this._pc.addIceCandidate(candidate);
	}
	async getStats() {
		return await this._pc.getStats();
	}
	async addTrack(track, ...streams) {
		const sender = await this._pc.addTrack(track, ...streams);
		if (streams.length > 0) {
			this._sfuManager.enableSimulcast(this._pc, track);
			this._sfuManager.enableSVC(this._pc, track);
		}
		this._sfuManager.monitorNetworkConditions(this._pc);
		return sender;
	}
	close() {
		this._pc.close();
	}
	createDataChannel(label, options) {
		return new RTCDataChannel(label, options);
	}
	getConfiguration() {
		return this._pc.getConfiguration();
	}
	getReceivers() {
		return this._pc.getReceivers();
	}
	getSenders() {
		return this._pc.getSenders();
	}
	getTransceivers() {
		return this._pc.getTransceivers();
	}
	removeTrack(sender) {
		return this._pc.removeTrack(sender);
	}
	setConfiguration(configuration) {
		this._pc.setConfiguration(configuration);
	}
	restartIce() {
		this._pc.restartIce();
	}
	get iceConnectionState() {
		return this._pc.iceConnectionState;
	}
	get iceGatheringState() {
		return this._pc.iceGatheringState;
	}
	get signalingState() {
		return this._pc.signalingState;
	}
	get localDescription() {
		return this._pc.localDescription ? new RTCSessionDescription(this._pc.localDescription) : null;
	}
	get remoteDescription() {
		return this._pc.remoteDescription ? new RTCSessionDescription(this._pc.remoteDescription) : null;
	}
}

/**
 * Media Devices interface.
 */
const mediaDevices = {
	getDisplayMedia: (constraints) => {
		validateAndSanitize(constraints);
		return wrtc.getDisplayMedia(constraints);
	},
	getUserMedia: (constraints) => {
		validateAndSanitize(constraints);
		return wrtc.getUserMedia(constraints);
	},
	getUserMediaAudioOnly: async () => {
		const constraints = { audio: true, video: false };
		return wrtc.getUserMedia(constraints);
	},
	getUserMediaVideoOnly: async () => {
		const constraints = { audio: false, video: true };
		return wrtc.getUserMedia(constraints);
	},
	enumerateDevices: () => {
		throw new Error('Not yet implemented; file a feature request against node-webrtc');
	},
	getSupportedConstraints: () => {
		throw new Error('Not yet implemented; file a feature request against node-webrtc');
	}
};

/**
 * Contains non-standard WebRTC features provided by the 'wrtc' library.
 * These features include utility functions and classes for media handling.
 * @namespace nonstandard
 */
const nonstandard = {
	i420ToRgba: wrtc.i420ToRgba,
	RTCAudioSink: wrtc.RTCAudioSink,
	RTCAudioSource: wrtc.RTCAudioSource,
	RTCVideoSink: wrtc.RTCVideoSink,
	RTCVideoSource: wrtc.RTCVideoSource,
	rgbaToI420: wrtc.rgbaToI420
};

module.exports = {
	RTCDataChannel,
	RTCIceCandidate,
	RTCSessionDescription,
	RTCPeerConnection,
	mediaDevices,
	nonstandard,
	encryptSDP,
	decryptSDP,
	setPreferredCodec,
	generateRoomId
};