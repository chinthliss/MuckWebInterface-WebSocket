import Connection from "./connection";
import ConnectionFaker from "./connection-faker";
import ConnectionWebSocket from "./connection-websocket";
import Channel from "./channel";
import {ConnectionStates, CoreOptions} from "./defs";

/**
 * Message in the form MSG<Channel>,<Message>,<Data>
 */
const msgRegExp: RegExp = /MSG(.*?),(.*?),(.*)/;

/**
 * System message in the form SYS<Message>,<Data>
 */
const sysRegExp: RegExp = /SYS(.*?),(.*?),(.*)/;

let environment: string = "production";

let localStorageAvailable: boolean = false;

let connectionStatus: ConnectionStates = ConnectionStates.disconnected;

let playerDbref: number | null = null;

let playerName: string | null = null;

let playerChangedHandlers: Function[] = [];

let statusChangedHandlers: Function[] = [];

let errorHandlers: Function[] = [];

let queuedRetryConnectionId: number = -1;

/**
 * Whether debug mode is on
 */
let debug: boolean = false;

/**
 * Our presently configured connection object
 */
let connection: Connection | null = null;

/**
 * A lookup list of registered channels
 */
const channels: { [channelName: string]: Channel } = {};

/**
 * Utility function to format errors
 * @param {string} message
 */
export const logError = (message: string): void => {
    console.log("Mwi-Websocket ERROR: " + message);
}

/**
 * Utility function to format debug lines and omit if disabled
 * @param {string} message
 */
export const logDebug = (message: string): void => {
    if (debug) console.log("Mwi-Websocket DEBUG: " + message);
}

/**
 * Enables or disables printing debug information into the console
 * @param trueOrFalse
 */
export const setDebug = (trueOrFalse: boolean): void => {
    if (!localStorageAvailable) {
        console.log("Can't set debug preference - local storage is not available.");
        return;
    }
    if (trueOrFalse) {
        debug = true;
        console.log("Console logging enabled.");
        localStorage.setItem('mwiWebsocket-debug', 'y');
    } else {
        debug = false;
        console.log("Console logging disabled.");
        localStorage.removeItem('mwiWebsocket-debug');
    }
}

export const handleConnectionFailure = (errorMessage: string): void => {
    throw "Not Implemented Yet";
};
export const receivedString = (stringReceived: string): void => {
    throw "Not Implemented Yet";
};

export const sendChannelMessage = (channel: string, message: string, data: any): void => {
    throw "Not Implemented Yet";
}

const sendSystemMessage = (message: string, data: any): void => {
    throw "Not Implemented Yet";
}

/**
 * Called by the hosting program to start everything up
 * @param {CoreOptions} options
 */
export const init = (options: CoreOptions): void => {

    if (connection) {
        logError("Attempt to run init() when initialisation has already taken place.");
        return;
    }

    // Set Environment
    environment = options?.environment || import.meta.env.MODE || "production";
    if (options.environment) environment = options.environment;

    // Previously this was a test to find something in order of self, window, global
    const context = globalThis;

    // Figure out whether we have local storage (And load debug option if so)
    localStorageAvailable = 'localStorage' in context;
    if (localStorageAvailable && localStorage.getItem('mwiWebsocket-debug') === 'y') debug = true;
    if (environment === 'localdevelopment') debug = true; // No local storage in localdev

    // Work out which connection we're using
    if (environment === 'test') connection = new ConnectionFaker(options);
    if (!connection) {
        if ("WebSocket" in context) {
            // Calculate where we're connecting to
            if (context.location) {
                if (!options.websocketUrl) options.websocketUrl =
                    (location.protocol === 'https:' ? 'wss://' : 'ws://') // Ensure same level of security as page
                    + location.hostname + "/mwi/ws";
                if (!options.authenticationUrl) options.authenticationUrl = location.origin + '/getWebsocketToken';
            }
            connection = new ConnectionWebSocket(options);
        }
    }
    if (!connection) throw "Failed to find any usable connection method";

    logDebug("Initialized Websocket in environment: " + environment);

    startConnection();
}

/**
 * Starts connection attempts to the configured connection
 */
const startConnection = () => {
    if (!connection) {
        logError("Attempt to start a connection when it hasn't been configured yet.");
        throw "Attempt to start a connection when it hasn't been configured yet."
    }
    logDebug("Starting connection.");
    queuedRetryConnectionId = -1;
    updateAndDispatchStatus(ConnectionStates.connecting);
    updateAndDispatchPlayer(-1, '');
    for (let channel in channels) {
        if (channels.hasOwnProperty(channel)) {
            //Channels will be re-joined if required, but we need to let them know to buffer until the muck acknowledges them.
            channels[channel].channelDisconnected();
        }
    }
    connection.connect();
};

//region Event Processing

/**
 *
 * @param callback
 */
const onPlayerChanged = (callback) => {
    playerChangedHandlers.push(callback);
}

/**
 *
 * @param {function} callback
 */
const onError = (callback) => {
    errorHandlers.push(callback);
}

/**
 * Registers a new callback that'll be informed of changes to the connection status.
 * The passed callback will immediately be called with the present status too.
 * @param {function} callback
 */
const onStatusChanged = (callback): void => {
    statusChangedHandlers.push(callback);
    callback(connectionStatus);
}

/**
 * Called by present connection
 * @param {number} newDbref New Dbref for player
 * @param {string} newName New name for the player
 */
export const updateAndDispatchPlayer = (newDbref, newName): void => {
    if (playerDbref === newDbref && playerName === newName) return;
    playerDbref = newDbref;
    playerName = newName;
    logDebug("Player changed: " + newName + '(' + newDbref + ')');
    for (let i = 0, maxi = playerChangedHandlers.length; i < maxi; i++) {
        try {
            playerChangedHandlers[i](newDbref, newName);
        } catch (e) {
        }
    }
}

/**
 * Called by present connection
 * @param {ConnectionStates} newStatus The New status
 */
export const updateAndDispatchStatus = (newStatus: ConnectionStates): void => {
    if (connectionStatus === newStatus) return;
    logDebug('Connection status changed to ' + newStatus + ' (from ' + connectionStatus + ')');
    connectionStatus = newStatus;

    // Maybe need to send channel join requests?
    if (newStatus === ConnectionStates.connected) {
        let channelsToJoin = [];
        for (let channel in channels) {
            if (channels.hasOwnProperty(channel) && !channels[channel].isChannelJoined()) {
                channelsToJoin.push(channel);
            }
        }
        if (channelsToJoin.length > 0) sendSystemMessage('joinChannels', channelsToJoin);
    }

    //Callbacks
    for (let i = 0, maxi = statusChangedHandlers.length; i < maxi; i++) {
        try {
            statusChangedHandlers[i](newStatus);
        } catch (e) {
        }
    }
};

/**
 * @param {string} error
 */
const dispatchCriticalError = (error): void => {
    logError("ERROR: " + error);
    for (let i = 0, maxi = errorHandlers.length; i < maxi; i++) {
        try {
            errorHandlers[i](error);
        } catch (e) {
        }
    }
}
//endregion Event Processing