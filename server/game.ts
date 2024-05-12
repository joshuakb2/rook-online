import { TypedEmitter } from 'tiny-typed-emitter';
import { Card, Color, PlayerName, Seat } from '../common/parsers';
import { assertNever, sleep } from '../common/utils';
import { AllSeated, Seats, allSeated, cardsEqual } from '../common/domain';
import '../common/declarations';
import { logGameEvent } from './logger';

type GameEvents = {
    updated: (game: Game) => void;
};

class GameEmitter extends TypedEmitter<GameEvents> {}

export const emitter = new GameEmitter();

export type Connected = Record<PlayerName, boolean>;
export type Bids = Record<Seat, number | null | 'passed'>;
export type Played = Record<Seat, Card | null>;
export type AllPlayed = Record<Seat, Card>;
export type Cards = Record<Seat, Card[]>;
export type Points = Record<Seat, number>;
export type Team = 'north_south' | 'east_west';

export type Game = {
    busy: boolean;
    connected: Connected;
    seats: Seats;
    dealer: Seat;
    phase: GamePhase;
} & TeamScores & TeamDeltas;

type TeamScores = {
    [TeamScore in `${Team}_score`]: number;
};

type TeamDeltas = {
    [TeamDeltas in `${Team}_deltas`]: number[];
};

type GamePhase =
    | PreDealPhase
    | BidPhase
    | NestPhase
    | TricksPhase
    | DonePhase

type PreDealPhase = {
    phase: 'pre-deal';
};

type BidPhase = {
    phase: 'bid';
    cards: Cards;
    nest: Card[];
    turn: Seat;
    bids: Bids;
};

type NestPhase = {
    phase: 'nest';
    cards: Cards;
    bid: number;
    wonBid: Seat;
};

type TricksPhase = {
    phase: 'tricks';
    cards: Cards;
    trumps: Color;
    nest: Card[];
    rook: Seat | 'nest';
    bid: number;
    wonBid: Seat;
    leader: Seat;
    turn: Seat;
    previousTrick: AllPlayed | null;
    played: Played;
    points: Points;
};

type DonePhase = {
    phase: 'done';
    bid: number;
    wonBid: Seat;
    rook: Seat | 'nest';
    points: Points;
    lastTrick: AllPlayed;
    north_south_delta: number;
    east_west_delta: number;
};

const game: Game = {
    busy: false,
    connected: {
        bill: false,
        deborah: false,
        josh: false,
        chris: false,
    },
    seats: {
        north: null,
        south: null,
        east: null,
        west: null,
    },
    dealer: 'north',
    north_south_score: 0,
    east_west_score: 0,
    north_south_deltas: [],
    east_west_deltas: [],
    phase: {
        phase: 'pre-deal',
    },
};

export type MessageFromClient = {
    type: 'connect';
    player: PlayerName;
} | {
    type: 'disconnect';
    player: PlayerName;
} | {
    type: 'sit';
    player: PlayerName;
    seat: Seat;
} | {
    type: 'stand';
    player: PlayerName;
} | {
    type: 'bid';
    player: PlayerName;
    amount: number;
} | {
    type: 'pass';
    player: PlayerName;
} | {
    type: 'chooseNest';
    player: PlayerName;
    trumps: Color;
    nest: Card[];
} | {
    type: 'play';
    player: PlayerName;
    card: Card;
} | {
    type: 'start_new_hand' | 'start_new_game';
};

const seatOf = (player: PlayerName): Seat => {
    for (const [seat, seatedPlayer] of Object.entries(game.seats)) {
        if (player === seatedPlayer) return seat;
    }

    throw new Error(`Player ${player} is not seated.`);
};

const seatOppositeOf = (seat: Seat): Seat => {
    switch (seat) {
        case 'north': return 'south';
        case 'south': return 'north';
        case 'east': return 'west';
        case 'west': return 'east';
        default: return assertNever(seat);
    }
};

const teamOf = (seat: Seat): Team => {
    switch (seat) {
        case 'north':
        case 'south':
            return 'north_south';
        case 'east':
        case 'west':
            return 'east_west';
        default:
            return assertNever(seat);
    }
};

const anyoneHasNotHadAChanceToBid = (bids: Bids): boolean =>
    bids.north === null ||
    bids.south === null ||
    bids.east === null ||
    bids.west === null;

const everyonePassed = (bids: Bids, dealer: Seat): boolean => {
    for (const [seat, bid] of Object.entries(bids)) {
        if (seat === dealer) continue;
        if (bid !== 'passed') return false;
    }

    return true;
};

const onlyOneBid = (bids: Bids): WonBid | null => {
    let wonBid: WonBid | null = null;

    for (const [seat, bid] of Object.entries(bids)) {
        if (bid === null) return null;
        if (bid === 'passed') continue;
        if (wonBid) return null;
        wonBid = {
            who: seat,
            highestBid: bid,
        };
    }

    return wonBid;
};

const someoneBid120 = (bids: Bids): WonBid | null => {
    for (const [seat, bid] of Object.entries(bids)) {
        if (bid === 120) return { who: seat, highestBid: 120 };
    }

    return null;
};

type WonBid = {
    who: Seat;
    highestBid: number;
};

const checkBids = (phase: BidPhase, seats: AllSeated) => {
    if (anyoneHasNotHadAChanceToBid(phase.bids)) {
        phase.turn = nextSeat(phase.turn);
        return;
    }

    let wonBid: WonBid | null = null;

    if (everyonePassed(phase.bids, game.dealer)) {
        wonBid = {
            who: game.dealer,
            highestBid: 70,
        };
    }

    if (!wonBid) (wonBid = onlyOneBid(phase.bids));
    if (!wonBid) (wonBid = someoneBid120(phase.bids));

    // If bidding continues
    if (!wonBid) {
        // Advance turn until we find someone who didn't pass
        while (phase.bids[phase.turn = nextSeat(phase.turn)] === 'passed') continue;
        return;
    };

    logGameEvent({
        event: 'wonBid',
        player: seats[wonBid.who],
    });

    const cards = phase.cards;

    cards[wonBid.who].push(...phase.nest);

    game.phase = {
        phase: 'nest',
        wonBid: wonBid.who,
        bid: wonBid.highestBid,
        cards,
    };
};

const nextSeat = (seat: Seat): Seat => {
    switch (seat) {
        case 'north': return 'east';
        case 'east': return 'south';
        case 'south': return 'west';
        case 'west': return 'north';
        default: return assertNever(seat);
    }
};

const allPlayed = (played: Played): played is AllPlayed => {
    for (const card of Object.values(played)) {
        if (card == null) return false;
    }
    return true;
};

const colorOf = (card: Card, trumps: Color) => card.rook ? trumps : card.color;

const beats = (cardToBeat: Card | null, card: Card, leadColor: Color, trumps: Color): boolean => {
    if (!cardToBeat) return true;
    if (cardToBeat.rook) return false;
    if (card.rook) return true;
    if (cardToBeat.color === trumps) {
        if (card.color !== trumps) return false;
        return card.number > cardToBeat.number;
    }
    if (card.color === trumps) return true;
    if (cardToBeat.color !== leadColor) return true;
    if (card.color !== leadColor) return false;
    return card.number > cardToBeat.number;
};

const pointValueOf = (card: Card): number => {
    if (card.rook) return 20;

    switch (card.number) {
        case 5:
            return 5;
        case 10:
        case 14:
            return 10;
        default:
            return 0;
    }
};

const pointsInTrick = (played: AllPlayed): number => {
    let points = 0;

    for (const card of Object.values(played)) {
        points += pointValueOf(card);
    }

    return points;
};

const handIsOver = (cardsBySeat: Cards): boolean => {
    // They should all have the same number of cards
    return cardsBySeat.north.length === 0;
};

const gameIsOver = (teamScores: TeamScores): boolean => {
    return teamScores.north_south_score !== teamScores.east_west_score && (
        teamScores.north_south_score >= 300 ||
        teamScores.east_west_score >= 300
    );
};

const checkTrick = (phase: TricksPhase, seats: AllSeated) => {
    if (!allPlayed(phase.played)) return;

    const played = phase.played;

    delayed(async () => {
        await sleep(3000);

        const leadColor = colorOf(played[phase.leader], phase.trumps);
        let _winner: Seat | null = null;
        let winningCard: Card | null = null;

        for (const [seat, card] of Object.entries(played)) {
            if (beats(winningCard, card, leadColor, phase.trumps)) {
                _winner = seat;
                winningCard = card;
            }
        }

        const winner = _winner;

        if (!winner) throw new Error('Somehow, there is no winner of the trick?');

        const pointsWon = pointsInTrick(played);
        phase.points[winner] += pointsWon;
        const maybeLastTrick = phase.previousTrick = played;
        phase.played = {
            north: null,
            south: null,
            east: null,
            west: null,
        };

        logGameEvent({
            event: 'wonTrick',
            player: seats[winner],
            played,
            pointsWon,
        });

        onGameChanged();

        if (handIsOver(phase.cards)) {
            await sleep(5000);

            for (const card of phase.nest) {
                phase.points[winner] += pointValueOf(card);
            }

            const north_south_total = phase.points.north + phase.points.south;
            const east_west_total = phase.points.east + phase.points.west;

            let north_south_delta: number;
            let east_west_delta: number;

            if (phase.wonBid === 'north' || phase.wonBid === 'south') {
                if (north_south_total >= phase.bid) {
                    north_south_delta = north_south_total;
                }
                else {
                    north_south_delta = -phase.bid;
                }
                east_west_delta = east_west_total;
            }
            else {
                if (east_west_total >= phase.bid) {
                    east_west_delta = east_west_total;
                }
                else {
                    east_west_delta = -phase.bid;
                }
                north_south_delta = north_south_total;
            }

            game.north_south_deltas.push(north_south_delta);
            game.east_west_deltas.push(east_west_delta);
            game.north_south_score += north_south_delta;
            game.east_west_score += east_west_delta;

            game.phase = {
                phase: 'done',
                bid: phase.bid,
                wonBid: phase.wonBid,
                rook: phase.rook,
                lastTrick: maybeLastTrick,
                points: phase.points,
                north_south_delta,
                east_west_delta,
            };

            logGameEvent({
                event: 'handFinished',
                north_south_delta,
                east_west_delta,
            });

            onGameChanged();

            await sleep(5000);

            if (gameIsOver(game)) {
                logGameEvent({
                    event: 'wonGame',
                    team: game.north_south_score > game.east_west_score ? 'north_south' : 'east_west',
                    north_south_score: game.north_south_score,
                    east_west_score: game.east_west_score,
                });
            }
        }
    });
};

const shuffle = <T>(arr: T[]): void => {
    for (let i = 0; i < arr.length; i++) {
        swap(i, Math.floor(Math.random() * arr.length));
    }

    function swap(i: number, j: number) {
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
};

const deal = (): { cards: Cards, nest: Card[] } => {
    const listOfAllCards: Card[] = [
        { rook: true },
        ...(['black', 'green', 'red', 'yellow'] as const).flatMap(color =>
            ([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const).map(number =>
                ({ rook: false, color, number })
            )
        ),
    ];

    shuffle(listOfAllCards);

    return {
        cards: {
            north: listOfAllCards.slice(0, 10),
            south: listOfAllCards.slice(10, 20),
            east: listOfAllCards.slice(20, 30),
            west: listOfAllCards.slice(30, 40),
        },
        nest: listOfAllCards.slice(40),
    };
};

const delayed = (f: () => Promise<void>): void => {
    game.busy = true;

    try {
        f().catch(onError).finally(onFinally);
    }
    catch (err) {
        onError(err);
    }
    finally {
        onFinally();
    }

    function onError(err: unknown) {
        console.error(new Date().toLocaleTimeString(), err);
    }

    function onFinally() {
        game.busy = false;
        onGameChanged();
    }
};

export const onMessageFromClient = (msg: MessageFromClient) => {
    switch (msg.type) {
        case 'connect':
            game.connected[msg.player] = true;
            break;

        case 'disconnect':
            game.connected[msg.player] = false;
            break;

        case 'sit':
            if (game.seats[msg.seat]) {
                throw new Error(`You cannot sit in the ${msg.seat} seat because ${game.seats[msg.seat]} is already seated there.`);
            }

            for (const [seat, player] of Object.entries(game.seats)) {
                if (player === msg.player) {
                    game.seats[seat] = null;
                }
            }
            game.seats[msg.seat] = msg.player;
            break;

        case 'stand': {
            switch (game.phase.phase) {
                case 'pre-deal':
                case 'done':
                    // That's fine
                    break;
                case 'bid':
                case 'nest':
                case 'tricks':
                    throw new Error(`You cannot stand up while the game is in the "${game.phase.phase}" phase.`);

                default:
                    return assertNever(game.phase);
            }

            for (const [seat, player] of Object.entries(game.seats)) {
                if (player === msg.player) {
                    game.seats[seat] = null;
                }
            }
            break;
        }

        case 'bid': {
            if (game.phase.phase !== 'bid') {
                throw new Error(`You cannot bid when the game phase is "${game.phase.phase}".`);
            }
            if (game.seats[game.phase.turn] !== msg.player) {
                throw new Error('You cannot bid when it is not your turn.');
            }
            if (!allSeated(game.seats)) {
                throw new Error('You cannot bid until everyone is seated.');
            }

            game.phase.bids[seatOf(msg.player)] = msg.amount;

            logGameEvent({
                event: 'bid',
                player: msg.player,
                amount: msg.amount,
            });

            checkBids(game.phase, game.seats);
            break;
        }

        case 'pass': {
            if (game.phase.phase !== 'bid') {
                throw new Error(`You cannot pass when the game phase is "${game.phase.phase}".`);
            }
            if (game.seats[game.phase.turn] !== msg.player) {
                throw new Error('You cannot pass when it is not your turn.');
            }
            if (!allSeated(game.seats)) {
                throw new Error('You cannot pass until everyone is seated.');
            }

            game.phase.bids[seatOf(msg.player)] = 'passed';

            logGameEvent({
                event: 'passed',
                player: msg.player,
            });

            checkBids(game.phase, game.seats);
            break;
        }

        case 'chooseNest': {
            if (game.phase.phase !== 'nest') {
                throw new Error(`You cannot choose the nest when the game phase is "${game.phase.phase}".`);
            }
            if (game.seats[game.phase.wonBid] !== msg.player) {
                throw new Error('You cannot bid when it is not your turn.');
            }

            const phase = game.phase;
            const cards = phase.cards;

            cards[phase.wonBid] = cards[phase.wonBid].filter(card =>
                msg.nest.every(nestCard => !cardsEqual(card, nestCard))
            );

            game.phase = {
                phase: 'tricks',
                cards,
                bid: phase.bid,
                wonBid: phase.wonBid,
                nest: msg.nest,
                rook: (['north', 'south', 'east', 'west'] as const).find(seat =>
                    phase.cards[seat].some(x => x.rook),
                ) ?? 'nest',
                trumps: msg.trumps,
                leader: phase.wonBid,
                turn: phase.wonBid,
                previousTrick: null,
                played: {
                    north: null,
                    south: null,
                    east: null,
                    west: null,
                },
                points: {
                    north: 0,
                    south: 0,
                    east: 0,
                    west: 0,
                },
            };

            logGameEvent({
                event: 'choseNest',
                cards: game.phase.cards,
                nest: game.phase.nest,
                trumps: game.phase.trumps,
            });

            break;
        }

        case 'play': {
            if (game.phase.phase !== 'tricks') {
                throw new Error(`You cannot play a card when the game phase is "${game.phase.phase}"`);
            }
            if (game.seats[game.phase.turn] !== msg.player) {
                throw new Error('You cannot play a card when it is not your turn!');
            }
            if (!allSeated(game.seats)) {
                throw new Error('You cannot play when not everyone is seated!');
            }

            const seat = seatOf(msg.player);

            game.phase.played[seat] = msg.card;
            game.phase.turn = nextSeat(seat);
            game.phase.cards[seat] = game.phase.cards[seat].filter(card =>
                !cardsEqual(card, msg.card)
            );

            logGameEvent({
                event: 'played',
                player: msg.player,
                card: msg.card,
            });

            checkTrick(game.phase, game.seats);
            break;
        }

        case 'start_new_hand': {
            if (!allSeated(game.seats)) {
                throw new Error('You cannot start a new hand when not everyone is seated!');
            }

            game.dealer = nextSeat(game.dealer);

            const { cards, nest } = deal();

            game.phase = {
                phase: 'bid',
                bids: {
                    north: null,
                    south: null,
                    east: null,
                    west: null,
                },
                cards,
                nest,
                turn: nextSeat(game.dealer),
            };

            logGameEvent({
                event: 'dealt',
                seats: game.seats,
                dealer: game.seats[game.dealer],
                cards,
                nest,
            });

            break;
        }

        case 'start_new_game': {
            if (!allSeated(game.seats)) {
                throw new Error('You cannot start a new game when not everyone is seated!');
            }

            game.dealer = nextSeat(game.dealer);
            game.north_south_deltas = [];
            game.east_west_deltas = [];
            game.north_south_score = 0;
            game.east_west_score = 0;

            const { cards, nest } = deal();

            game.phase = {
                phase: 'bid',
                bids: {
                    north: null,
                    south: null,
                    east: null,
                    west: null,
                },
                cards,
                nest,
                turn: nextSeat(game.dealer),
            };

            logGameEvent({ event: 'newGame' });
            logGameEvent({
                event: 'dealt',
                seats: game.seats,
                dealer: game.seats[game.dealer],
                cards,
                nest,
            });

            break;
        }

        default: return assertNever(msg);
    }

    onGameChanged();
};

export const getGame = () => game;

const onGameChanged = () => emitter.emit('updated', game);
