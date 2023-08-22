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

/**
 * Present environment we're operating in
 */
let environment: string = "production";

/**
 * Whether we can use local storage. Set in initialization.
 */
let localStorageAvailable: boolean = false;

/**
 * Present connection status
 */
let connectionStatus: ConnectionStates = ConnectionStates.disconnected;

/**
 * Present player's database reference or null
 */
let playerDbref: number | null = null;

/**
 * Present player's name or null
 */
let playerName: string | null = null;

/**
 * Callbacks to be notified when the player gets changed
 */
let playerChangedHandlers: Function[] = [];

/**
 * Callbacks to be notified when the connection status gets changed
 */
let statusChangedHandlers: Function[] = [];

/**
 * Callbacks to be notified when something goes wrong
 */
let errorHandlers: Function[] = [];

/**
 * Timeout mostly used to ensure we don't have multiple connection attempts
 */
let queuedConnectionTimeout: ReturnType<typeof setTimeout> | null = null;

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
 */
export const logError = (message: string): void => {
    console.log("Mwi-Websocket ERROR: " + message);
}

/**
 * Utility function to format debug lines and omit if disabled
 */
export const logDebug = (message: string): void => {
    if (debug) console.log("Mwi-Websocket DEBUG: " + message);
}

/**
 * Enables or disables printing debug information into the console
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

/**
 * Used by the present connection to pass back a string for processing
 */
export const receivedStringFromConnection = (stringReceived: string): void => {
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

    queueConnection();
}

/**
 * Used as entry point for both new connections and reconnects
 */
const queueConnection = () => {
    let delay: number = 0; // Leaving room to turn this into a calculation
    queuedConnectionTimeout = setTimeout(startConnection, delay);
    logDebug("Connection retry queued.");
}

/**
 * Utility function to unset the connection timeout
 */
const clearConnectionTimeout = () => {
    if (queuedConnectionTimeout) {
        clearTimeout(queuedConnectionTimeout);
        queuedConnectionTimeout = null;
    }
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
    clearConnectionTimeout();
    updateAndDispatchStatus(ConnectionStates.connecting);
    updateAndDispatchPlayer(null, null);
    for (let channel in channels) {
        if (channels.hasOwnProperty(channel)) {
            //Channels will be re-joined if required, but we need to let them know to buffer until the muck acknowledges them.
            channels[channel].channelDisconnected();
        }
    }
    connection.connect();
};

/**
 * Shut down the connection completely
 */
const stopConnection = () => {
    if (!connection) return;
    logDebug("Stopping connection.");
    clearConnectionTimeout();
    updateAndDispatchStatus(ConnectionStates.disabled);
    updateAndDispatchPlayer(null, null);
    for (let channel in channels) {
        if (channels.hasOwnProperty(channel)) {
            //Channels will be re-joined if required, but we need to let them know to buffer until the muck acknowledges them.
            channels[channel].channelDisconnected();
        }
    }
    connection.disconnect();
}

//region Event Processing

/**
 * Register a callback to be notified when the active player changes
 * Will be called with (playerDbref, playerName).
 */
export const onPlayerChanged = (callback) => {
    playerChangedHandlers.push(callback);
}

/**
 * Register a callback to be notified when there's an error
 */
export const onError = (callback) => {
    errorHandlers.push(callback);
}

/**
 * Registers a new callback that'll be informed of changes to the connection status.
 * The passed callback will immediately be called with the present status too.
 */
export const onStatusChanged = (callback): void => {
    statusChangedHandlers.push(callback);
    callback(connectionStatus);
}

/**
 * Called by present connection
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
 * Called when there's a critical error
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