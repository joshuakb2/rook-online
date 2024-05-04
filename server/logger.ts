import * as fs from 'fs';
import type { AllPlayed, Cards, Team } from './game';
import type { Card, Color, PlayerName } from '../common/parsers';
import { AllSeated } from '../common/domain';

const fileStream = fs.createWriteStream('game.log', {
    flags: 'a',
    encoding: 'utf-8',
});

export type GameEvent = {
    event: 'newGame';
} | {
    event: 'dealt';
    seats: AllSeated;
    cards: Cards;
    nest: Card[];
    dealer: PlayerName;
} | {
    event: 'bid';
    player: PlayerName;
    amount: number;
} | {
    event: 'passed';
    player: PlayerName;
} | {
    event: 'wonBid';
    player: PlayerName;
} | {
    event: 'choseNest';
    cards: Cards;
    nest: Card[];
    trumps: Color;
} | {
    event: 'played';
    player: PlayerName;
    card: Card;
} | {
    event: 'wonTrick';
    player: PlayerName;
    played: AllPlayed;
    pointsWon: number;
} | {
    event: 'handFinished';
    north_south_delta: number;
    east_west_delta: number;
} | {
    event: 'wonGame';
    team: Team;
    north_south_score: number;
    east_west_score: number;
};

export const logGameEvent = (event: GameEvent) => fileStream.write(JSON.stringify({
    ts: Date.now(),
    ...event,
}) + '\n');
