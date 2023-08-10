import { expect, test } from 'vitest';

import websocket from '../src/index.js';

test('Core', () => {
    expect(websocket.init).toBeTypeOf('function');
    expect(websocket.init).toHaveReturned();
});