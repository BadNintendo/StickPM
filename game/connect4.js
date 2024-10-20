/*  ██╗██╗                                                                                           ██╗██╗
 *  ██║╚═╝  ███████╗████████╗██╗ ██████╗██╗  ██╗██████╗ ███╗   ███╗     ██████╗ ██████╗ ███╗   ███╗  ╚═╝██║
 *  ██║     ██╔════╝╚══██╔══╝██║██╔════╝██║ ██╔╝██╔══██╗████╗ ████║    ██╔════╝██╔═══██╗████╗ ████║     ██║
 *  ██║     ███████╗   ██║   ██║██║     █████╔╝ ██████╔╝██╔████╔██║    ██║     ██║   ██║██╔████╔██║     ██║
 *  ██║     ╚════██║   ██║   ██║██║     ██╔═██╗ ██╔═══╝ ██║╚██╔╝██║    ██║     ██║   ██║██║╚██╔╝██║     ██║
 *  ██║     ███████║   ██║   ██║╚██████╗██║  ██╗██║     ██║ ╚═╝ ██║ ██╗╚██████╗╚██████╔╝██║ ╚═╝ ██║     ██║
 *  ██║██╗  ╚══════╝   ╚═╝   ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝     ╚═╝ ╚═╝ ╚═════╝ ╚═════╝ ╚═╝     ╚═╝  ██╗██║
 *  ╚═╝╚═╝                                                                                           ╚═╝╚═╝
 * StickPM Project
 * © 2024 BadNintendo - Connect4 Games Module
 * All rights reserved.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

class Connect4 {
    constructor(roomId) {
        this.roomId = roomId;
        this.board = Array.from({ length: 6 }, () => Array(7).fill(null));
        this.currentPlayer = 'R';
        this.players = {};
        this.winner = null;
    }
    addPlayer(playerId) {
        if (Object.keys(this.players).length < 2) {
            this.players[playerId] = this.currentPlayer === 'R' ? 'Red' : 'Yellow';
            this.currentPlayer = this.currentPlayer === 'R' ? 'Y' : 'R';
            return true;
        }
        return false;
    }
    dropDisc(playerId, column) {
        if (!this.players[playerId] || this.winner) return { error: 'Invalid move or game already ended.' };
        const playerColor = this.players[playerId] === 'Red' ? 'R' : 'Y';
        if (playerColor !== this.currentPlayer) return { error: 'Not your turn.' };
        for (let row = this.board.length - 1; row >= 0; row--) {
            if (!this.board[row][column]) {
                this.board[row][column] = playerColor;
                this.currentPlayer = this.currentPlayer === 'R' ? 'Y' : 'R';
                this.checkWin(row, column, playerColor);
                return { board: this.board, currentPlayer: this.currentPlayer, winner: this.winner };
            }
        }
        return { error: 'Column is full.' };
    }
    checkWin(row, col, playerColor) {
        const directions = [{ x: 0, y: 1 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: -1 }];
        for (const { x, y } of directions) {
            let count = 1;
            for (const sign of [-1, 1]) {
                let step = 1;
                while (true) {
                    const r = row + sign * step * x;
                    const c = col + sign * step * y;
                    if (r >= 0 && r < 6 && c >= 0 && c < 7 && this.board[r][c] === playerColor) {
                        count++;
                        step++;
                    } else {
                        break;
                    }
                }
            }
            if (count >= 4) {
                this.winner = playerColor === 'R' ? 'Red' : 'Yellow';
                break;
            }
        }
    }
    getBoardState() {
        return { board: this.board, winner: this.winner };
    }
}

module.exports = Connect4;