import { z } from 'zod';

export const playerNameParser = z.union([
    z.literal('bill'),
    z.literal('deborah'),
    z.literal('josh'),
    z.literal('maia'),
]);

export type PlayerName = z.infer<typeof playerNameParser>;

export const seatParser = z.union([
    z.literal('north'),
    z.literal('south'),
    z.literal('east'),
    z.literal('west'),
]);

export type Seat = z.infer<typeof seatParser>;

export const rookParser = z.object({ rook: z.literal(true) });

export const colorParser = z.union([
    z.literal('black'),
    z.literal('green'),
    z.literal('red'),
    z.literal('yellow'),
]);

export type Color = z.infer<typeof colorParser>;

export const cardNumberParser = z.union([
    z.literal(4),
    z.literal(5),
    z.literal(6),
    z.literal(7),
    z.literal(8),
    z.literal(9),
    z.literal(10),
    z.literal(11),
    z.literal(12),
    z.literal(13),
    z.literal(14),
]);

export const normalCardParser = z.object({
    rook: z.literal(false),
    color: colorParser,
    number: cardNumberParser,
});

export const cardParser = z.discriminatedUnion('rook', [
    rookParser,
    normalCardParser,
]);

export type Card = z.infer<typeof cardParser>;
