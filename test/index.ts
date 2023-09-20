import {expect, test, vi, describe, afterEach} from 'vitest';

import websocket, {ConnectionState} from '../src/index.js';

vi.useFakeTimers();

afterEach(() => {
    websocket.stop();
    vi.runAllTimers();
});

describe("Core", () => {
    test('Starts successfully', () => {
        expect(websocket.start).to.be.a('function');
        const startSpy = vi.fn(websocket.start);
        startSpy();
        expect(startSpy).toHaveReturned();
    });

    test('Stops successfully', () => {
        websocket.start();
        websocket.stop();
        vi.runAllTimers();
        expect (websocket.getConnectionState()).to.equal(ConnectionState.disconnected);
    });

    test('Allows registering an error callback', () => {
        expect(websocket).to.haveOwnProperty('onError');
        expect(websocket.onError).to.be.a('function');
        expect(() => websocket.onError(() => {
        })).to.not.throw();
    });
});

describe("Connection Status", () => {
    test('should be able to register a callback for connection status changes', () => {
        expect(websocket).to.haveOwnProperty('onConnectionStateChanged');
        expect(websocket.onConnectionStateChanged).to.be.a('function');
        expect(() => websocket.onConnectionStateChanged(() => {
        })).to.not.throw();
    });

    test("should have changed from 'disconnected' to 'connected'", () => {
        expect(websocket.getConnectionState()).to.equal(ConnectionState.disconnected);
        websocket.start();
        vi.runAllTimers();
        expect(websocket.getConnectionState()).to.equal(ConnectionState.connected);
    });

    test('Should throw an immediate event with present status on registering', async () => {
        await websocket.onConnectionStateChanged((newStatus) => {
            expect(newStatus).to.equal(ConnectionState.disconnected);
        });
        vi.runAllTimers();
    })

    test('Should throw an event when connection status changes', async () => {
        websocket.start();
        vi.runAllTimers();
        await websocket.onConnectionStateChanged((newStatus) => {
            expect(newStatus).to.equal(ConnectionState.connected);
        });
    })

});

describe('Player', function () {

    test('Should be able to register a callback for player changes', () => {
        expect(websocket).to.haveOwnProperty('onPlayerChanged');
        expect(websocket.onPlayerChanged).to.be.a('function');
        expect(() => websocket.onPlayerChanged(() => {
        })).to.not.throw();
    });

    test('Should be set to expected test values', () => {
        websocket.start();
        vi.runAllTimers();
        expect(websocket.getPlayerDbref()).to.equal(1);
        expect(websocket.getPlayerName()).to.equal('TestPlayer');
        expect(websocket.isPlayerSet()).to.equal(true);
    })

    test('Should throw an event for change', async () => {
        expect(websocket.getPlayerName()).to.equal(null);
        expect(websocket.getPlayerDbref()).to.equal(null);
        websocket.start();
        vi.runAllTimers();
        await websocket.onPlayerChanged((newDbref, newName) => {
            expect(newDbref).to.equal(1);
            expect(newName).to.equal('TestPlayer');
        });
    })
});

describe('Channels', function () {

    test('Should be able to get a channel interface', () => {
        expect(websocket).to.haveOwnProperty('channel');
        expect(websocket.channel).to.be.a('function');
        const channel = websocket.channel('test');
        expect(channel).to.be.a('object');
        expect(channel.send).to.be.a('function');
        expect(channel.on).to.be.a('function');
    })

    test('Should be able to send a message', () => {
        const channel = websocket.channel('test');
        expect(() => {
            channel.send('out');
        }).to.not.throw();
    })

    test('Should be able to send a message with data', () => {
        const channel = websocket.channel('test');
        expect(() => {
            channel.send('out', 1234);
        }).to.not.throw();
    })

    test('Should be able to receive a message', async () => {
        const channel = websocket.channel('test');
        await channel.on('reflected', (data) => {
            expect(data).to.equal(null);
        });
        expect(() => {
            channel.send('reflect');
        }).to.not.throw();
    })

    test('Should be able to receive a message with data', async () => {
        const channel = websocket.channel('test');
        await channel.on('reflected', (data) => {
            expect(data).to.equal('data');
        });
        expect(() => {
            channel.send('reflect', 'data');
        }).to.not.throw();
    })

    test('Should be able to register a monitor callback', async() => {
        const channel = websocket.channel('test');
        channel.send('reflect', 'data')
        await channel.any((_message, data) => {
            expect(data).to.equal('data');
        });
    })

});