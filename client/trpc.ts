import { createTRPCProxyClient, createWSClient, wsLink } from '@trpc/client';
import type { AppRouter } from '../server/trpc';
import type { Game } from '../server/game';

export const trpc = createTRPCProxyClient<AppRouter>({
    links: [
        wsLink({
            client: createWSClient({ url: `ws://${location.hostname}:3001/` }),
        }),
    ],
});

trpc.gameUpdate.subscribe(undefined, {
    onData: game => gameUpdates.emit(game),
});

class GameUpdates {
    private handlers = new Set<(game: Game) => void>();

    register(handler: (game: Game) => void): void {
        this.handlers.add(handler);
    }

    unregister(handler: (game: Game) => void): void {
        this.handlers.delete(handler);
    }

    emit(game: Game): void {
        for (const handler of this.handlers) handler(game);
    }
}

export const gameUpdates = new GameUpdates();
