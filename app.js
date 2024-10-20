/*  ██╗██╗                                                                                           ██╗██╗
 *  ██║╚═╝  ███████╗████████╗██╗ ██████╗██╗  ██╗██████╗ ███╗   ███╗     ██████╗ ██████╗ ███╗   ███╗  ╚═╝██║
 *  ██║     ██╔════╝╚══██╔══╝██║██╔════╝██║ ██╔╝██╔══██╗████╗ ████║    ██╔════╝██╔═══██╗████╗ ████║     ██║
 *  ██║     ███████╗   ██║   ██║██║     █████╔╝ ██████╔╝██╔████╔██║    ██║     ██║   ██║██╔████╔██║     ██║
 *  ██║     ╚════██║   ██║   ██║██║     ██╔═██╗ ██╔═══╝ ██║╚██╔╝██║    ██║     ██║   ██║██║╚██╔╝██║     ██║
 *  ██║     ███████║   ██║   ██║╚██████╗██║  ██╗██║     ██║ ╚═╝ ██║ ██╗╚██████╗╚██████╔╝██║ ╚═╝ ██║     ██║
 *  ██║██╗  ╚══════╝   ╚═╝   ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝     ╚═╝ ╚═╝ ╚═════╝ ╚═════╝ ╚═╝     ╚═╝  ██╗██║
 *  ╚═╝╚═╝                                                                                           ╚═╝╚═╝
 * StickPM Project
 * © 2024 BadNintendo - Web/App Module
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
 * This is the main entry point of the StickPM application. It initializes 
 * the Express app, applies middlewares, sets up HTTP and HTTPS servers, 
 * configures Socket.io for real-time communication, and loads the routes 
 * and views for the application.
 */

require('dotenv').config();
const fs = require('fs');
const http = require('http');
const path = require('path');
const https = require('https');
const express = require('express');
const socketIo = require('socket.io');
const { json, urlencoded, static } = express;
const sharedsession = require('express-socket.io-session');
const {
	domainCheckMiddleware,
	sessionMiddleware,
	applyMiddlewares
} = require('./modules/middleware');
const { setupWebSocket } = require('./modules/socket');
const database = require('./modules/database');
const routes = require('./modules/routes');

const HTTP_PORT = process.env.HTTP_PORT || 80;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;

const httpsOptions = {
	key: fs.readFileSync('./server.key', 'utf8'),
	cert: fs.readFileSync('./server.crt', 'utf8')
};

const app = express();

app.use(domainCheckMiddleware);

const httpServer = http.createServer(app);
const httpsServer = https.createServer(httpsOptions, app);

httpServer.keepAliveTimeout = 120000;
httpsServer.keepAliveTimeout = 120000;

const io = socketIo(httpServer, {
	transports: ['websocket'],
	allowUpgrades: false,
	pingInterval: 5000,
	pingTimeout: 10000,
	cors: { //if socket issues will direct to proper cors
		origin: '*',
	}
});
const ioHttps = socketIo(httpsServer, {
	transports: ['websocket'],
	allowUpgrades: false,
	pingInterval: 5000,
	pingTimeout: 10000,
	cors: {
		origin: '*',
	}
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('subdomain offset', 2);

app.use(static(path.join(__dirname, 'public')));

applyMiddlewares(app);

app.use(json({ limit: '5mb' }));
app.use(urlencoded({ limit: '5mb', extended: true }));
io.use(sharedsession(sessionMiddleware, { autoSave: true }));
ioHttps.use(sharedsession(sessionMiddleware, { autoSave: true }));

setupWebSocket(io, sharedsession, sessionMiddleware);
setupWebSocket(ioHttps, sharedsession, sessionMiddleware);

routes(app);

httpServer.listen(HTTP_PORT, () => console.log(`HTTP Server listening on port ${HTTP_PORT}`));
httpsServer.listen(HTTPS_PORT, () => console.log(`HTTPS Server listening on port ${HTTPS_PORT}`));

/**⠀⠀⠀StickPM⠀Project⠀⠀⠀⠀           ⣴⠚⢳⣦⠀⠀⠀⠀⠀⠀⠀
 *⠀⠀‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾⠀  ⠀⠀       ⣼⣷⠾⠛⢻⣷⡄⠀⠀⠀⠀⠀⠀
 *⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀      ⢰⣿⣇⣠⣤⣸⣿⣧⠀⠀⠀⠀⠀⠀
 *⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀    ⠀⠀⠀  ⠀⠀⠀⠀⢠⡿⠋⣁⣀⣀⣈⠙⣿⣆⠀⠀⠀© 2024 BadNintendo⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
 *⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀   ⠀⠀⠀⠀  ⠀⠀⠀⠀⢾⡆⠀ ⣿⣀⣀⣿⠀ ⣸⡿⠀⠀‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
 *⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀     ⠀ ⠀⢠⣿⣷⠀⠈⠉⠉⠁⢸⣿⣿⡄⠀⠀⠀⠀
 *⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀    ⠀  ⠀⠀⠀⠀⣾⠿⢿⡇ ‾‾‾ ⢸⡿⠿⣷⠀⠀⠀⠀
 *⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀    ⠀  ⠀⠀⠀⠸⣿⣶⣾⠃⠀⠀⠀⠀⠘⣷⣶⣿⠇⠀⠀ 
 *⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀    ⠀⠀ ⠀ ⠀⠀⠀⠉⢹⣷⠀⠀⠀⠀⣾⡏⠉⠀⠀⠀⠀⠀
 *⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀    ⠀ ⠀ ⠀⠀⠀⠀⢸⣿⣧⣀⣀⣼⣿⡇⠀⠀⠀⠀⠀⠀
 *⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀    ⠀⠀  ⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀
 *⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀    ⠀⠀  ⠀⠀⠀⠀⠸⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀
 *⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ ⠀⠀    ⠀ ⠀⠀⠀⠀⢻⣿⣿⣿⣿⣿⠇
 *⠀⠀⠀⠀⠀⠀⠀⠀			⠀⠀All rights⠀ ⠹⣿⣿⡿⠃ reserved
 *					‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
 *  Description: Developing a Node.js application using Express, Socket.IO, and WebRTC for a scalable SFU (Selective Forwarding Unit) on stickpm.com
 */