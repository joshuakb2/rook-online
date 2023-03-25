import { TypedEmitter } from 'tiny-typed-emitter';
import { Card, Color, PlayerName, Seat } from '../common/parsers';
import { assertNever, sleep } from '../common/utils';
import { cardsEqual } from '../common/domain';
import '../common/declarations';

type GameEvents = {
    updated: (game: Game) => void;
};

class GameEmitter extends TypedEmitter<GameEvents> {}

export const emitter = new GameEmitter();

type Bids = Record<Seat, number | null | 'passed'>;
type Played = Record<Seat, Card | null>;
type AllPlayed = Record<Seat, Card>;
type Cards = Record<Seat, Card[]>;

export type Game = {
    busy: boolean;
    connected: Record<PlayerName, boolean>;
    seats: Record<Seat, PlayerName | null>;
    dealer: Seat;
    north_south_score: number;
    east_west_score: number;
    north_south_deltas: number[];
    east_west_deltas: number[];
    phase: GamePhase;
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
    points: Record<Seat, number>;
};

type DonePhase = {
    phase: 'done';
    bid: number;
    wonBid: Seat;
    rook: Seat | 'nest';
    points: Record<Seat, number>;
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
        maia: false,
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

const teamOf = (seat: Seat) => {
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

const everyonePassed = (bids: Bids, dealer: Seat): boolean => {
    for (const [seat, bid] of Object.entries(bids)) {
        if (seat === dealer) continue;
        if (bid !== 'passed') return false;
    }

    return true;
};

const onlyOneBid = (bids: Bids): [Seat | null, number | null] => {
    let wonBid: Seat | null = null;
    let highestBid: number | null = null;

    for (const [seat, bid] of Object.entries(bids)) {
        if (bid === null) return [null, null];
        if (bid === 'passed') continue;
        if (wonBid) return [null, null];
        wonBid = seat;
        highestBid = bid;
    }

    return [wonBid, highestBid];
};

const someoneBid120 = (bids: Bids): [Seat | null, number | null] => {
    for (const [seat, bid] of Object.entries(bids)) {
        if (bid === 120) return [seat, bid];
    }

    return [null, null];
};

const checkBids = (phase: BidPhase) => {
    let wonBid: Seat | null = null;
    let highestBid: number | null = null;

    if (everyonePassed(phase.bids, game.dealer)) {
        wonBid = game.dealer;
        highestBid = 70;
    }

    if (!wonBid) ([ wonBid, highestBid ] = onlyOneBid(phase.bids));
    if (!wonBid) ([ wonBid, highestBid ] = someoneBid120(phase.bids));

    if (!wonBid || !highestBid) return;

    const cards = phase.cards;

    cards[wonBid].push(...phase.nest);

    game.phase = {
        phase: 'nest',
        wonBid,
        bid: highestBid,
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

const checkTrick = (phase: TricksPhase) => {
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

        phase.points[winner] += pointsInTrick(played);
        const maybeLastTrick = phase.previousTrick = played;
        phase.played = {
            north: null,
            south: null,
            east: null,
            west: null,
        };

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

            console.log(
                'Game complete!',
                'Josh was playing with',
                game.seats[seatOppositeOf(seatOf('josh'))],
            );
            console.log(
                'The dealer was',
                game.dealer,
                'and the bid went to',
                game.seats[game.phase.wonBid],
                'for',
                game.phase.bid
            );
            console.log(
                'Josh\'s team scored',
                game.phase[`${teamOf(seatOf('josh'))}_delta`],
                'and the other team scored',
                game.phase[`${teamOf(nextSeat(seatOf('josh')))}_delta`],
            );
            if (game.phase.rook === 'nest') {
                console.log('Something unprecedented has happened. The rook was put in the nest!?!?!?');
            }
            else {
                console.log(game.seats[game.phase.rook], 'had the rook.');
            }

            onGameChanged();

            await sleep(5000);
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

            game.phase.bids[seatOf(msg.player)] = msg.amount;
            game.phase.turn = nextSeat(game.phase.turn);
            checkBids(game.phase);
            break;
        }

        case 'pass': {
            if (game.phase.phase !== 'bid') {
                throw new Error(`You cannot pass when the game phase is "${game.phase.phase}".`);
            }
            if (game.seats[game.phase.turn] !== msg.player) {
                throw new Error('You cannot pass when it is not your turn.');
            }

            game.phase.bids[seatOf(msg.player)] = 'passed';
            checkBids(game.phase);
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
            break;
        }

        case 'play': {
            if (game.phase.phase !== 'tricks') {
                throw new Error(`You cannot play a card when the game phase is "${game.phase.phase}"`);
            }
            if (game.seats[game.phase.turn] !== msg.player) {
                throw new Error('You cannot play a card when it is not your turn!');
            }

            const seat = seatOf(msg.player);

            game.phase.played[seat] = msg.card;
            game.phase.turn = nextSeat(seat);
            game.phase.cards[seat] = game.phase.cards[seat].filter(card =>
                !cardsEqual(card, msg.card)
            );
            checkTrick(game.phase);
            break;
        }

        case 'start_new_hand': {
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
            break;
        }

        case 'start_new_game': {
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
            break;
        }

        default: return assertNever(msg);
    }

    onGameChanged();
};

export const getGame = () => game;

const onGameChanged = () => emitter.emit('updated', game);
