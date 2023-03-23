import { createTRPCProxyClient, createWSClient, wsLink } from '@trpc/client';
import type { AppRouter } from '../server/trpc';

export const trpc = createTRPCProxyClient<AppRouter>({
    links: [
        wsLink({
            client: createWSClient({ url: `ws://${location.hostname}:3001/` }),
        })
    ],
});

window.trpc = trpc;

trpc.gameUpdate.subscribe(undefined, {
    onData: game => {
        document.body.innerHTML = `<pre>${JSON.stringify(game, null, 2)}</pre>`;
    },
});
