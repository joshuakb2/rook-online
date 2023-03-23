export {};

declare global {
    interface ObjectConstructor {
        keys<T>(obj: T): T extends Record<infer K, any> ? K[] : (keyof T)[];
        values<T>(obj: T): T extends Record<any, infer V> ? V[] : T[keyof T];
        entries<T>(obj: T): T extends Record<infer K, infer V> ? [K, V][] : [keyof T, T[keyof T]];
    }
}
