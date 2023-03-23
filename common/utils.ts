export const assertNever = (never: never): never => {
    void never;
    throw new Error('This should never happen.');
};
