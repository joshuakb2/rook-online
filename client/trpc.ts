import { createTRPCProxyClient, createWSClient, wsLink } from '@trpc/client';
import type { AppRouter } from '../server/trpc';
import type { Game } from '../server/game';
import { PlayerName } from '../common/parsers';

export const trpc = createTRPCProxyClient<AppRouter>({
    links: [
        wsLink({
            client: createWSClient({ url: `ws://${location.hostname}:3001/` }),
        }),
    ],
});

trpc.recognizeIdentity.subscribe(undefined, {
    onData: player => trpcUpdates.emit('identity_updated', player),
});

trpc.gameUpdate.subscribe(undefined, {
    onData: game => trpcUpdates.emit('game_updated', game),
});

type EventMap = Record<string, (...args: readonly any[]) => void>;

class EventDispatcher<Events extends EventMap> {
    private handlers = new Map<string, Set<(...args: readonly any[]) => void>>();

    register<Event extends keyof Events & string>(event: Event, handler: Events[Event]): void {
        let eventHandlers = this.handlers.get(event);
        if (!eventHandlers) {
            eventHandlers = new Set();
            this.handlers.set(event, eventHandlers);
        }

        eventHandlers.add(handler);
    }

    unregister<Event extends keyof Events & string>(event: Event, handler: Events[Event]): void {
        const eventHandlers = this.handlers.get(event);
        if (!eventHandlers) return;

        eventHandlers.delete(handler);
        if (eventHandlers.size === 0) this.handlers.delete(event);
    }

    emit<Event extends keyof Events & string>(event: Event, ...args: Parameters<Events[Event]>): void {
        const eventHandlers = this.handlers.get(event);
        if (!eventHandlers) return;

        for (const handler of eventHandlers) {
            handler(...args);
        }
    }
}

export const trpcUpdates = new EventDispatcher<{
    identity_updated: (player: PlayerName | null) => void;
    game_updated: (game: Game) => void;
}>();
