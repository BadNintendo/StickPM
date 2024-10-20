/*  ██╗██╗                                                                                           ██╗██╗
 *  ██║╚═╝  ███████╗████████╗██╗ ██████╗██╗  ██╗██████╗ ███╗   ███╗     ██████╗ ██████╗ ███╗   ███╗  ╚═╝██║
 *  ██║     ██╔════╝╚══██╔══╝██║██╔════╝██║ ██╔╝██╔══██╗████╗ ████║    ██╔════╝██╔═══██╗████╗ ████║     ██║
 *  ██║     ███████╗   ██║   ██║██║     █████╔╝ ██████╔╝██╔████╔██║    ██║     ██║   ██║██╔████╔██║     ██║
 *  ██║     ╚════██║   ██║   ██║██║     ██╔═██╗ ██╔═══╝ ██║╚██╔╝██║    ██║     ██║   ██║██║╚██╔╝██║     ██║
 *  ██║     ███████║   ██║   ██║╚██████╗██║  ██╗██║     ██║ ╚═╝ ██║ ██╗╚██████╗╚██████╔╝██║ ╚═╝ ██║     ██║
 *  ██║██╗  ╚══════╝   ╚═╝   ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝     ╚═╝ ╚═╝ ╚═════╝ ╚═════╝ ╚═╝     ╚═╝  ██╗██║
 *  ╚═╝╚═╝                                                                                           ╚═╝╚═╝
 * StickPM Project
 * © 2024 BadNintendo - Chess Games Module
 * All rights reserved.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

class Chess {
    constructor(roomId) {
        this.roomId = roomId;
        this.board = this.initializeBoard();
        this.turn = 'white';
        this.players = { white: null, black: null };
        this.history = [];
        this.isGameOver = false;
    }
    initializeBoard() {
        return [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
        ];
    }
    setPlayer(color, playerId) {
        if (color in this.players) {
            this.players[color] = playerId;
            return true;
        }
        return false;
    }
    move(playerId, from, to) {
        if (this.isGameOver) return { error: 'Game is over' };
        const playerColor = Object.keys(this.players).find(color => this.players[color] === playerId);
        if (!playerColor || playerColor !== this.turn) return { error: 'Not your turn' };
        const [fromX, fromY] = this.parsePosition(from);
        const [toX, toY] = this.parsePosition(to);
        if (this.isValidMove(fromX, fromY, toX, toY, playerColor)) {
            this.board[toY][toX] = this.board[fromY][fromX];
            this.board[fromY][fromX] = '';
            this.turn = this.turn === 'white' ? 'black' : 'white';
            this.history.push({ from, to });
            return { success: true, board: this.board };
        } else {
            return { error: 'Invalid move' };
        }
    }
    parsePosition(pos) {
        const file = pos.charCodeAt(0) - 'a'.charCodeAt(0);
        const rank = 8 - parseInt(pos[1], 10);
        return [file, rank];
    }
    isValidMove(fromX, fromY, toX, toY, color) {
        const piece = this.board[fromY][fromX];
        if (!piece) return false;
        return true;
    }
    getGameState() {
        return { board: this.board, turn: this.turn, history: this.history };
    }
    resetGame() {
        this.board = this.initializeBoard();
        this.turn = 'white';
        this.history = [];
        this.isGameOver = false;
    }
    isEmpty() {
        return !this.players.white && !this.players.black;
    }
}

module.exports = Chess;