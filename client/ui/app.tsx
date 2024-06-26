import React, { CSSProperties } from 'react';
import type { Game } from '../../server/game';
import { Card, PlayerName, Seat } from '../../common/parsers';
import { trpc } from '../trpc';
import { CardSvg } from './card';
import { assertNever } from '../../common/utils';

export type AppProps = {
    game: Game | null;
    player: PlayerName | null;
};

export const App = (props: AppProps) => {
    return <div
        style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'lightgreen',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
        }}
    >
        {props.game ? <GameUI {...props} game={props.game}/> : <NoGame/>}
    </div>;
};

const NoGame = () => <div
    style={{
        fontSize: '5vmin',
    }}
>
    Trying to connect to the server...
</div>;

type GameUIProps = {
    game: Game;
    player: PlayerName | null;
}

const GameUI = ({ game, player }: GameUIProps) => {
    return <div style={{
        width: '100vmin',
        height: '100vmin',
        backgroundColor: 'darkgreen',
        position: 'relative',
    }}>
        {player
            ? <Table {...{ player, game }}/>
            : <ChoosePlayer {...{ game }}/>
        }
        <UnseatedPlayers game={game}/>
    </div>;
};

const UnseatedPlayers = ({ game }: { game: Game }) => <div
    style={{
        position: 'absolute',
        top: 0,
        left: 0,
        paddingLeft: '5px',
    }}
>
    {(['josh', 'chris', 'deborah', 'bill'] as const).filter(
        player => game.connected[player] && !seatOf(player, game)
    ).map(
        player => <p key={player}>{player} is connected but not seated.</p>
    )}
</div>;

type ChoosePlayerProps = {
    game: Game;
};

const ChoosePlayer = ({ game }: ChoosePlayerProps) => {
    return <div style={{
        display: 'grid',
        gridTemplateRows: '1fr min-content 1fr',
        alignItems: 'center',
        fontSize: '5vmin',
        height: '100%',
    }}>
        <p style={{
            gridRow: 1,
            textAlign: 'center',
            alignSelf: 'start',
        }}>Who are you?</p>

        <div style={{
            gridRow: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            marginLeft: 'auto',
            marginRight: 'auto',
        }}>
            {(['josh', 'chris', 'deborah', 'bill'] as const).map(player =>
                <button
                    type='button'
                    key={player}
                    disabled={game.connected[player]}
                    onClick={() => trpc.announce.mutate(player)}
                >
                    {player.replace(/^./, c => c.toUpperCase())}
                </button>
            )}
        </div>
    </div>;
};

const seatOf = (player: PlayerName, game: Game): Seat | null => {
    for (const [seat, seatedPlayer] of Object.entries(game.seats)) {
        if (player === seatedPlayer) return seat;
    }

    return null;
};

type ChosePlayerProps = {
    player: PlayerName;
    game: Game;
};

const Table = ({ player, game }: ChosePlayerProps) => {
    const mySeat = seatOf(player, game);

    return <>
        {(['north', 'south', 'east', 'west'] as const).map(seat => <React.Fragment key={seat}>
            <PlayedCard {...{ seat, mySeat, game }} />
            <div style={getStyleForSeatNameOnSide(sideOf(seat, mySeat))}>
                {game.seats[seat] != null
                    ? <div>
                        {seat}<br/>
                        {game.seats[seat]}
                    </div>
                    : <a
                        style={{
                            cursor: 'pointer',
                            color: 'blue',
                            textDecoration: 'underline',
                        }}
                        onClick={() => trpc.sit.mutate(seat)}
                    >{seat}</a>
                }
            </div>
        </React.Fragment>)}
    </>;
};

type Side = 'top' | 'bottom' | 'left' | 'right';

const sides: Side[] = [
    'bottom',
    'left',
    'top',
    'right',
];

const seats: Seat[] = [
    'south',
    'west',
    'north',
    'east',
];

const sideOf = (seat: Seat, yourSeat: Seat | null): Side => {
    const offset = yourSeat ? seats.indexOf(yourSeat) : 0;
    return atLooping(sides, seats.indexOf(seat) - offset)!;
}

const atLooping = <T,>(arr: T[], i: number): T => {
    if (arr.length === 0) throw new Error('The list must be non-empty.');
    while (i >= arr.length) i -= arr.length;
    while (i < 0) i += arr.length;
    return arr[i];
};

type PlayedCardProps = {
    seat: Seat;
    mySeat: Seat | null;
    game: Game;
};

const PlayedCard = ({ seat, mySeat, game }: PlayedCardProps) => {
    if (!mySeat) return null;

    let card: Card | null = null;

    switch (game.phase.phase) {
        case 'pre-deal':
        case 'bid':
        case 'nest':
        case 'done':
            break;
        case 'tricks':
            card = game.phase.played[seat];
            break;
        default:
            return assertNever(game.phase);
    }

    if (!card) return null;

    return <CardSvg
        card={card}
        style={getStyleForPlayedCardOnSide(sideOf(seat, mySeat))}
    />;
};

const getStyleForPlayedCardOnSide = (side: Side): CSSProperties => ({
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    top:
        side === 'top' ? '35%' :
        side === 'bottom' ? '65%' :
        '50%',
    left:
        side === 'left' ? '35%' :
        side === 'right' ? '65%' :
        '50%',
    height: '10%',
});

const getStyleForSeatNameOnSide = (side: Side): CSSProperties => ({
    position: 'absolute',
    ...(side === 'left' || side === 'right'
        ? {
            writingMode: 'vertical-rl',
            textOrientation: 'sideways',
        }
        : {}
    ),
    transform: side === 'left' ? 'rotate(180deg)' : 'unset',
    textAlign: 'center',
    top: side === 'bottom' ? 'unset' : 0,
    bottom: side === 'top' ? 'unset' : 0,
    left: side === 'right' ? 'unset' : 0,
    right: side === 'left' ? 'unset' : 0,
    fontSize: '5vmin',
});
