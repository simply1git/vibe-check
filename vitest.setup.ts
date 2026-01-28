import { beforeAll } from 'vitest'

// Polyfill Web Crypto API if needed for JSDOM environments where it might be missing or partial
if (typeof globalThis.crypto === 'undefined') {
    // @ts-ignore
    globalThis.crypto = require('crypto').webcrypto;
}
