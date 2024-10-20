/*  ██╗██╗                                                                                           ██╗██╗
 *  ██║╚═╝  ███████╗████████╗██╗ ██████╗██╗  ██╗██████╗ ███╗   ███╗     ██████╗ ██████╗ ███╗   ███╗  ╚═╝██║
 *  ██║     ██╔════╝╚══██╔══╝██║██╔════╝██║ ██╔╝██╔══██╗████╗ ████║    ██╔════╝██╔═══██╗████╗ ████║     ██║
 *  ██║     ███████╗   ██║   ██║██║     █████╔╝ ██████╔╝██╔████╔██║    ██║     ██║   ██║██╔████╔██║     ██║
 *  ██║     ╚════██║   ██║   ██║██║     ██╔═██╗ ██╔═══╝ ██║╚██╔╝██║    ██║     ██║   ██║██║╚██╔╝██║     ██║
 *  ██║     ███████║   ██║   ██║╚██████╗██║  ██╗██║     ██║ ╚═╝ ██║ ██╗╚██████╗╚██████╔╝██║ ╚═╝ ██║     ██║
 *  ██║██╗  ╚══════╝   ╚═╝   ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝     ╚═╝ ╚═╝ ╚═════╝ ╚═════╝ ╚═╝     ╚═╝  ██╗██║
 *  ╚═╝╚═╝                                                                                           ╚═╝╚═╝
 * StickPM Project
 * © 2024 BadNintendo - Mafia Games Module
 * All rights reserved.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

class Mafia {
    constructor(roomId) {
        this.roomId = roomId;
        this.players = {};
        this.roles = ['mafia', 'doctor', 'cop', 'citizen'];
        this.nightActions = [];
        this.isNight = true;
        this.votes = {};
    }
    addPlayer(playerId, username) {
        if (Object.keys(this.players).length >= 10) return false;
        this.players[playerId] = { username, role: null, alive: true };
        return true;
    }
    assignRoles() {
        const shuffledPlayers = Object.keys(this.players).sort(() => 0.5 - Math.random());
        shuffledPlayers.forEach((playerId, index) => {
            this.players[playerId].role = this.roles[index % this.roles.length];
        });
    }
    performNightAction(playerId, targetId, action) {
        if (!this.players[playerId] || !this.players[targetId]) return false;
        this.nightActions.push({ playerId, targetId, action });
        return true;
    }
    resolveNightActions() {
        this.nightActions.forEach(({ playerId, targetId, action }) => {
            const role = this.players[playerId].role;
            if (role === 'mafia' && action === 'kill') {
                this.players[targetId].alive = false;
            } else if (role === 'doctor' && action === 'save') {
                this.players[targetId].alive = true;
            }
        });
        this.nightActions = [];
        this.isNight = false;
    }
    vote(playerId, targetId) {
        if (!this.players[playerId] || !this.players[targetId]) return false;
        this.votes[targetId] = (this.votes[targetId] || 0) + 1;
        return true;
    }
    lynch() {
        const votedOut = Object.keys(this.votes).reduce((a, b) => (this.votes[a] > this.votes[b] ? a : b));
        if (votedOut) this.players[votedOut].alive = false;
        this.votes = {};
        this.isNight = true;
    }
    getGameState() {
        return {
            players: this.players,
            isNight: this.isNight
        };
    }
    isEmpty() {
        return Object.keys(this.players).length === 0;
    }
}

module.exports = Mafia;