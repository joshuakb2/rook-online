import React from 'react';
import { createRoot } from 'react-dom/client';
import { trpcUpdates } from './trpc';
import { App } from './ui/app';
import type { Game } from '../server/game';
import { PlayerName } from '../common/parsers';

const appDiv = document.getElementById('app');
if (!appDiv) throw new Error('#app does not exist!');

const root = createRoot(appDiv);

let game: Game | null = null;
let player: PlayerName | null = null;

trpcUpdates.register('identity_updated', newPlayer => {
    player = newPlayer;
    render();
});

trpcUpdates.register('game_updated', newGame => {
    game = newGame;
    render();
});

render();

function render() {
    root.render(<App {...{ game, player }} />);
}
