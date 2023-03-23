import { Card, PlayerName, Seat } from './parsers';

export const allSeated = (seats: Record<Seat, PlayerName | undefined>) =>
    Boolean(
        seats.north &&
        seats.south &&
        seats.east &&
        seats.west
    );

export const cardsEqual = (a: Card, b: Card): boolean => {
    if (a.rook !== b.rook) return false;
    if (a.rook || b.rook) return true;
    if (a.color !== b.color) return false;
    if (a.number !== b.number) return false;
    return true;
};
