import Core, {ConnectionStates} from "./core";
import Connection from "./connection";

/**
 * A fake connection for testing purposes
 */
export default class ConnectionFaker extends Connection {

    constructor(core: Core, options = {}) {
        super(core, options);
    }

    connect(): void {
        this.core.updateAndDispatchStatus(ConnectionStates.connected);
        this.core.updateAndDispatchPlayer(1, 'TestPlayer');
    }

    sendString(stringToSend: string): void {
        //Reflect anything that has 'reflect' as the message
        let [channel, message, data] = stringToSend.split(',', 3);
        if (message === 'reflect') {
            channel = channel.slice(3);
            this.core.receivedString('MSG' + channel + ',reflected,' + data);
        }
    }

}