import { expect, test, vi } from 'vitest';

import websocket from '../src/index.js';

test('Initializes successfully', () => {
    expect(websocket.init).toBeTypeOf('function');
    const initSpy = vi.fn(websocket.init);
    initSpy();
    expect(initSpy).toHaveReturned();
});