export const assertNever = (never: never): never => {
    void never;
    throw new Error('This should never happen.');
};

export const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
