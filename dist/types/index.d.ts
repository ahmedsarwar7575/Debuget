#!/usr/bin/env node
export declare const log: (err: any) => Promise<void>;
export declare const setConfig: (newTheme: any) => void;
export declare const expressMiddleware: () => (err: any, req: any, res: any, next: any) => Promise<void>;
