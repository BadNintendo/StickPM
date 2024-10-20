/*  ██╗██╗                                                                                           ██╗██╗
 *  ██║╚═╝  ███████╗████████╗██╗ ██████╗██╗  ██╗██████╗ ███╗   ███╗     ██████╗ ██████╗ ███╗   ███╗  ╚═╝██║
 *  ██║     ██╔════╝╚══██╔══╝██║██╔════╝██║ ██╔╝██╔══██╗████╗ ████║    ██╔════╝██╔═══██╗████╗ ████║     ██║
 *  ██║     ███████╗   ██║   ██║██║     █████╔╝ ██████╔╝██╔████╔██║    ██║     ██║   ██║██╔████╔██║     ██║
 *  ██║     ╚════██║   ██║   ██║██║     ██╔═██╗ ██╔═══╝ ██║╚██╔╝██║    ██║     ██║   ██║██║╚██╔╝██║     ██║
 *  ██║     ███████║   ██║   ██║╚██████╗██║  ██╗██║     ██║ ╚═╝ ██║ ██╗╚██████╗╚██████╔╝██║ ╚═╝ ██║     ██║
 *  ██║██╗  ╚══════╝   ╚═╝   ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝     ╚═╝ ╚═╝ ╚═════╝ ╚═════╝ ╚═╝     ╚═╝  ██╗██║
 *  ╚═╝╚═╝                                                                                           ╚═╝╚═╝
 * StickPM Project
 * © 2024 BadNintendo - Poker Games Module
 * All rights reserved.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

class Poker {
    constructor() {
        this.players = [];
        this.deck = this.createDeck();
        this.currentPlayerIndex = 0;
        this.gameState = 'waiting';
    }
    createDeck() {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        let deck = [];
        for (let suit of suits) {
            for (let value of values) {
                deck.push({ suit, value });
            }
        }
        return deck.sort(() => Math.random() - 0.5);
    }
    addPlayer(player) {
        if (this.players.length < 10) {
            this.players.push(player);
            return true;
        }
        return false;
    }
    dealCards() {
        for (let player of this.players) {
            player.hand = [this.deck.pop(), this.deck.pop()];
        }
        this.gameState = 'playing';
    }
    nextTurn() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        return this.players[this.currentPlayerIndex];
    }
    getGameState() {
        return {
            players: this.players,
            currentPlayer: this.players[this.currentPlayerIndex],
            gameState: this.gameState
        };
    }
    resetGame() {
        this.players = [];
        this.deck = this.createDeck();
        this.currentPlayerIndex = 0;
        this.gameState = 'waiting';
    }
}

module.exports = Poker;