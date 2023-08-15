enum ConnectionStates {
    disconnected = 'disconnected', // Only used before startup
    connecting = 'connecting',
    connected = 'connected',
    disabled = 'disabled' // For when no more attempts will happen
}

/**
 * Message in the form MSG<Channel>,<Message>,<Data>
 */
const msgRegExp: RegExp = /MSG(.*?),(.*?),(.*)/;

/**
 * System message in the form SYS<Message>,<Data>
 */
const sysRegExp: RegExp = /SYS(.*?),(.*?),(.*)/;

export default class Core {

    environment: string = "production";

    localStorageAvailable: boolean = false;

    connectionStatus: ConnectionStates = ConnectionStates.disconnected;

    playerDbref: number | null = null;

    playerName: string | null = null;

    playerChangedHandlers: Function[] = [];

    statusChangedHandlers: Function[] = [];

    errorHandlers: Function[] = [];

    debug: boolean = false;

    //connection

    //channels

    /**
     * Enables or disables printing debug information into the console
     * @param trueOrFalse
     */
    setDebug(trueOrFalse: boolean): void {
        if (!this.localStorageAvailable) {
            console.log("Can't set debug preference - local storage is not available.");
            return;
        }
        if (trueOrFalse) {
            this.debug = true;
            console.log("Console logging enabled.");
            localStorage.setItem('mwiWebsocket-debug', 'y');
        } else {
            this.debug = false;
            console.log("Console logging disabled.");
            localStorage.removeItem('mwiWebsocket-debug');
        }
    }

    /**
     * Utility function to format errors
     * @param {string} message
     */
    logError(message: string): void {
        console.log("Mwi-Websocket ERROR: " + message);
    }

    /**
     * Utility function to format debug lines and omit if disabled
     * @param {string} message
     */
    logDebug(message: string): void {
        if (this.debug) console.log("Mwi-Websocket DEBUG: " + message);
    }

}