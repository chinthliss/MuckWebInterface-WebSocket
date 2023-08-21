import {updateAndDispatchStatus, updateAndDispatchPlayer, receivedString} from "./core";
import {ConnectionStates} from "./defs";
import Connection from "./connection";

/**
 * A fake connection for testing purposes
 */
export default class ConnectionFaker extends Connection {

    constructor(options = {}) {
        super(options);
    }

    connect(): void {
        updateAndDispatchStatus(ConnectionStates.connected);
        updateAndDispatchPlayer(1, 'TestPlayer');
    }

    sendString(stringToSend: string): void {
        //Reflect anything that has 'reflect' as the message
        let [channel, message, data] = stringToSend.split(',', 3);
        if (message === 'reflect') {
            channel = channel.slice(3);
            receivedString('MSG' + channel + ',reflected,' + data);
        }
    }

}