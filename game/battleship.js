/*  ██╗██╗                                                                                           ██╗██╗
 *  ██║╚═╝  ███████╗████████╗██╗ ██████╗██╗  ██╗██████╗ ███╗   ███╗     ██████╗ ██████╗ ███╗   ███╗  ╚═╝██║
 *  ██║     ██╔════╝╚══██╔══╝██║██╔════╝██║ ██╔╝██╔══██╗████╗ ████║    ██╔════╝██╔═══██╗████╗ ████║     ██║
 *  ██║     ███████╗   ██║   ██║██║     █████╔╝ ██████╔╝██╔████╔██║    ██║     ██║   ██║██╔████╔██║     ██║
 *  ██║     ╚════██║   ██║   ██║██║     ██╔═██╗ ██╔═══╝ ██║╚██╔╝██║    ██║     ██║   ██║██║╚██╔╝██║     ██║
 *  ██║     ███████║   ██║   ██║╚██████╗██║  ██╗██║     ██║ ╚═╝ ██║ ██╗╚██████╗╚██████╔╝██║ ╚═╝ ██║     ██║
 *  ██║██╗  ╚══════╝   ╚═╝   ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝     ╚═╝ ╚═╝ ╚═════╝ ╚═════╝ ╚═╝     ╚═╝  ██╗██║
 *  ╚═╝╚═╝                                                                                           ╚═╝╚═╝
 * StickPM Project
 * © 2024 BadNintendo - Battleship Games Module
 * All rights reserved.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

class Battleship {
    constructor() {
        this.players = [];
        this.boardSize = 10;
        this.ships = [5, 4, 3, 3, 2];
        this.gameState = 'waiting';
    }
    addPlayer(player) {
        if (this.players.length < 2) {
            player.board = this.createBoard();
            player.ships = this.ships.map(size => ({
                size,
                hits: 0,
                placed: false
            }));
            this.players.push(player);
            return true;
        }
        return false;
    }
    createBoard() {
        return Array(this.boardSize).fill(null).map(() => Array(this.boardSize).fill(null));
    }
    placeShip(player, x, y, size, orientation) {
        if (this.isPlacementValid(player.board, x, y, size, orientation)) {
            for (let i = 0; i < size; i++) {
                if (orientation === 'horizontal') {
                    player.board[y][x + i] = 'ship';
                } else {
                    player.board[y + i][x] = 'ship';
                }
            }
            player.ships.find(ship => ship.size === size && !ship.placed).placed = true;
            return true;
        }
        return false;
    }
    isPlacementValid(board, x, y, size, orientation) {
        if (orientation === 'horizontal') {
            if (x + size > this.boardSize) return false;
            for (let i = 0; i < size; i++) {
                if (board[y][x + i]) return false;
            }
        } else {
            if (y + size > this.boardSize) return false;
            for (let i = 0; i < size; i++) {
                if (board[y + i][x]) return false;
            }
        }
        return true;
    }
    attack(player, x, y) {
        const opponent = this.players.find(p => p !== player);
        if (opponent.board[y][x] === 'ship') {
            opponent.board[y][x] = 'hit';
            return 'hit';
        } else {
            opponent.board[y][x] = 'miss';
            return 'miss';
        }
    }
    getGameState() {
        return {
            players: this.players,
            gameState: this.gameState
        };
    }
    resetGame() {
        this.players = [];
        this.gameState = 'waiting';
    }
}

module.exports = Battleship;