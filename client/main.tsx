import React from 'react';
import { createRoot } from 'react-dom/client';
import { gameUpdates, trpc } from './trpc';
import { App } from './ui/app';
import type { Game } from '../server/game';
import { PlayerName } from '../common/parsers';

const appDiv = document.getElementById('app');
if (!appDiv) throw new Error('#app does not exist!');

const root = createRoot(appDiv);

let game: Game | null = null;
let player: PlayerName | null = null;

const setPlayer = (name: PlayerName) => {
    trpc.announce.mutate(name).then(() => {
        player = name;
        render();
    })
};

gameUpdates.register(newGame => {
    game = newGame;

    if (player && !newGame.connected[player]) {
        setPlayer(player);
        player = null;
    }

    render();
});

render();

function render() {
    root.render(<App {...{ game, player, setPlayer }} />);
}
