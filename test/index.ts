import {expect, test, vi, describe} from 'vitest';

import websocket from '../src/index.js';

vi.useFakeTimers();

describe("Core", () => {
    test('Initializes successfully', () => {
        expect(websocket.init).to.be.a('function');
        const initSpy = vi.fn(websocket.init);
        initSpy();
        expect(initSpy).toHaveReturned();
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

    test("should have changed from 'disconnected' to 'connect'", () => {
        expect(websocket.getConnectionState()).to.equal('disconnected');
        vi.runAllTimers();
        expect(websocket.getConnectionState()).to.equal('connected');
    });

    test('Should throw an event with present status on registering', async () => {
        await websocket.onConnectionStateChanged((newStatus) => {
            expect(newStatus).to.equal('connected');
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

    test('Should be set to test values', () => {
        expect(websocket.getPlayerDbref()).to.equal(1);
        expect(websocket.getPlayerName()).to.equal('TestPlayer');
        expect(websocket.isPlayerSet()).to.equal(true);
    })

    test('Should throw an event for change', async () => {
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

    test('Should be able to receive a message', async () => {
        const channel = websocket.channel('test');
        await channel.on('reflected', (data) => {
            expect(data).to.equal('data');
        });
        expect(() => {
            channel.send('reflect', 'data');
        }).to.not.throw();
    })

});