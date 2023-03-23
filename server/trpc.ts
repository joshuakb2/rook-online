import { initTRPC } from '@trpc/server';
import { applyWSSHandler, CreateWSSContextFnOptions } from '@trpc/server/adapters/ws';
import * as ws from 'ws';
import { z } from 'zod';
import { cardParser, colorParser, PlayerName, playerNameParser, seatParser } from '../common/parsers';
import { Game, onMessageFromClient, emitter as gameEmitter } from './game';
import { observable } from '@trpc/server/observable';

const createContext = async (opts: CreateWSSContextFnOptions) => {
    const ws: ws.WebSocket & { player?: PlayerName } = opts.res;

    ws.once('close', () => {
        if (ws.player) {
            onMessageFromClient({
                type: 'disconnect',
                player: ws.player,
            });
        }
    });

    return ws;
};

const t = initTRPC.context<typeof createContext>().create();

const router = t.router;

const appRouter = router({
    announce: t.procedure
        .input(playerNameParser)
        .mutation(req => {
            req.ctx.player = req.input;
            onMessageFromClient({
                type: 'connect',
                player: req.input,
            });
        }),
    sit: t.procedure
        .input(seatParser)
        .mutation(req => {
            if (!req.ctx.player) throw new Error('Cannot sit before choosing a player!');
            onMessageFromClient({
                type: 'sit',
                player: req.ctx.player,
                seat: req.input,
            });
        }),
    stand: t.procedure
        .input(z.undefined())
        .mutation(req => {
            if (!req.ctx.player) throw new Error('Cannot stand before choosing a player!');
            onMessageFromClient({
                type: 'stand',
                player: req.ctx.player,
            });
        }),
    bid: t.procedure
        .input(z.number())
        .mutation(req => {
            if (!req.ctx.player) throw new Error('Cannot bid before choosing a player!');
            onMessageFromClient({
                type: 'bid',
                player: req.ctx.player,
                amount: req.input,
            });
        }),
    pass: t.procedure
        .input(z.undefined())
        .mutation(req => {
            if (!req.ctx.player) throw new Error('Cannot pass before choosing a player!');
            onMessageFromClient({
                type: 'pass',
                player: req.ctx.player,
            });
        }),
    chooseNest: t.procedure
        .input(z.object({
            trumps: colorParser,
            nest: z.array(cardParser),
        }))
        .mutation(req => {
            if (!req.ctx.player) throw new Error('Cannot choose nest before choosing a player!');
            onMessageFromClient({
                type: 'chooseNest',
                player: req.ctx.player,
                ...req.input,
            });
        }),
    play: t.procedure
        .input(cardParser)
        .mutation(req => {
            if (!req.ctx.player) throw new Error('Cannot bid before choosing a player!');
            onMessageFromClient({
                type: 'play',
                player: req.ctx.player,
                card: req.input,
            });
        }),
    start_new_hand: t.procedure
        .input(z.undefined())
        .mutation(req => {
            onMessageFromClient({ type: 'start_new_hand' });
        }),
    start_new_game: t.procedure
        .input(z.undefined())
        .mutation(req => {
            onMessageFromClient({ type: 'start_new_game' });
        }),

    gameUpdate: t.procedure
        .input(z.undefined())
        .subscription(req => {
            return observable<Game>(emit => {
                gameEmitter.on('updated', emit.next);
                req.ctx.on('close', () => gameEmitter.off('updated', emit.next));
                return () => gameEmitter.off('updated', emit.next);
            });
        }),
});

export type AppRouter = typeof appRouter;

const wss = new ws.WebSocketServer({ port: 3001 });
const handler = applyWSSHandler({ wss, router: appRouter, createContext })

process.on('SIGTERM', () => {
    handler.broadcastReconnectNotification();
    wss.close();
});
