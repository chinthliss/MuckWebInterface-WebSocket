import Connection from "./connection";
import ConnectionFaker from "./connection-faker";
import ConnectionWebSocket from "./connection-websocket";
import Channel from "./channel";
import ChannelInterface from "./channel-interface";
import {
    InitialMode,
    ConnectionErrorCallback,
    ConnectionStates,
    ConnectionStatusCallback,
    CoreOptions,
    PlayerChangedCallback
} from "./defs";

/**
 * Message in the form MSG<Channel>,<Message>,<Data>
 */
const msgRegExp: RegExp = /MSG(.*?),(.*?),(.*)/;

/**
 * System message in the form SYS<Message>,<Data>
 */
const sysRegExp: RegExp = /SYS(.*?),(.*?),(.*)/;

/**
 * Present mode we're operating in
 */
let mode: string = "production";

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
let playerChangedCallbacks: PlayerChangedCallback[] = [];

/**
 * Callbacks to be notified when the connection status gets changed
 */
let connectionStatusChangedCallbacks: ConnectionStatusCallback[] = [];

/**
 * Callbacks to be notified when something goes wrong
 */
let connectionErrorCallbacks: ConnectionErrorCallback[] = [];

/**
 * Timeout mostly used to ensure we don't have multiple connection attempts
 */
let queuedConnectionTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Number of failed attempts, so we can slow down on the retries over time
 */
let connectionFailures: number = 0;

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
        logError("Can't set debug preference - local storage is not available.");
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

/**
 * Called by the connection. If the fault wasn't fatal, a reconnect is queued
 */
export const handleConnectionFailure = (errorMessage: string, fatal: boolean = false): void => {
    connectionFailures++;
    dispatchError(errorMessage);
    // Start again unless the problem was fatal
    if (fatal) {
        logError("Fatal Connection Error - cancelling any further attempt to connect.");
        stopConnection();
    } else {
        queueConnection()
    }
}

/**
 * Called by the connection. Stops any queued connections and resets failed count
 * Does not handle setting player-dbref/player-name since that can vary on connection
 */
export const handleConnectionSuccess = () => {
    logDebug("Resetting failed count due to success.");
    clearConnectionTimeout();
    connectionFailures = 0;
}

/**
 * Used by the present connection to pass back a raw string for processing
 */
export const receivedStringFromConnection = (stringReceived: string): void => {
    if (stringReceived.indexOf('MSG') === 0) {
        let channel: string, message: string, data: any;
        try {
            let dataAsJson: string | null;
            [, channel, message, dataAsJson] = stringReceived.match(msgRegExp) || [null, '', '', null];
            data = (dataAsJson ? null : JSON.parse(<string>dataAsJson));
        } catch (e) {
            logError("Failed to parse string as incoming channel message: " + stringReceived);
            console.log(e);
            return;
        }
        if (message === '') {
            logError("Incoming channel message had an empty message: " + stringReceived);
            return;
        }
        if (debug) console.log("[ << " + channel + "." + message + "] ", data);
        receivedChannelMessage(channel, message, data);
        return;
    }
    if (stringReceived.indexOf('SYS') === 0) {
        let message: string, data: any;
        try {
            let dataAsJson: string | null;
            [, message, dataAsJson] = stringReceived.match(sysRegExp) || [null, '', null];
            data = (dataAsJson ? null : JSON.parse(<string>dataAsJson));
        } catch (e) {
            logError("Failed to parse string as incoming system message: " + stringReceived);
            return;
        }
        if (message === '') {
            logError("Incoming system message had an empty message: " + stringReceived);
            return;
        }
        if (debug) console.log("[ << " + message + "] ", data);
        receivedSystemMessage(message, data);
        return;
    }
    logError("Don't know what to do with the string: " + stringReceived);
};

export const sendChannelMessage = (channel: string, message: string, data: any): void => {
    if (!connection) {
        logDebug(`Attempt to send a channel message whilst not connected: ${channel}:${message}`);
        return;
    }
    if (debug) console.log("[ >> " + channel + "." + message + "] ", data);
    let parsedData: string = (typeof data !== 'undefined' ? JSON.stringify(data) : '');
    let parsedMessage: string = ["MSG", channel, ',', message, ',', parsedData].join('');
    connection.sendString(parsedMessage);
}

const sendSystemMessage = (message: string, data: any): void => {
    if (!connection) {
        logDebug(`Attempt to send a system message whilst not connected: ${message}`);
        return;
    }
    if (debug) console.log("[ >> " + message + "] ", data);
    let parsedData: string = (typeof data !== 'undefined' ? JSON.stringify(data) : '');
    let parsedMessage: string = ["SYS", message, ',', parsedData].join('');
    connection.sendString(parsedMessage);
}

const receivedSystemMessage = (message: string, data: any): void => {
    switch (message) {
        case 'channel':
            // Let the channel know it's joined, so it can process buffered items
            if (data in channels) channels[data].channelConnected();
            else logError("Muck acknowledged joining a channel we weren't aware of! Channel: " + data);
            break;
        case 'test':
            logDebug("Mwi-Websocket Test message received. Data=" + data);
            break;
        case 'ping': //This is actually http only, websockets do it at a lower level
            sendSystemMessage('pong', data);
            break;
        default:
            logError("Unrecognized system message received: " + message);
    }
}

const receivedChannelMessage = (channelName: string, message: string, data: any): void => {
    if (channelName in channels)
        channels[channelName].receiveMessage(message, data);
    else
        logError("Received message on channel we're not aware of! Channel = " + channelName);
}

/**
 * Called by the hosting program to start everything up
 */
export const init = (options: CoreOptions = {}): void => {

    if (connection) {
        logError("Attempt to run init() when initialisation has already taken place.");
        return;
    }

    // Set Environment
    mode = options?.environment || InitialMode || "production";
    if (options.environment) mode = options.environment;

    // Previously this was a test to find something in order of self, window, global
    const context = globalThis;

    // Figure out whether we have local storage (And load debug option if so)
    localStorageAvailable = 'localStorage' in context;
    if (localStorageAvailable && localStorage.getItem('mwiWebsocket-debug') === 'y') debug = true;
    if (mode === 'localdevelopment') debug = true; // No local storage in this mode, so assuming

    // Work out which connection we're using
    if (mode === 'test' || options.useFaker) connection = new ConnectionFaker(options);
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

    logDebug("Initialized Websocket in environment: " + mode);

    queueConnection();
}

/**
 * Used as entry point for both new connections and reconnects
 */
const queueConnection = () => {
    let delay: number = connectionFailures * 100;
    queuedConnectionTimeout = setTimeout(startConnection, delay);
    logDebug(`Connection attempt queued with a delay of ${delay}ms.`);
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
 * Shut down the connection completely. Will stop any further attempts to connect.
 */
export const stopConnection = () => {
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

/**
 * Returns a channel interface to talk to a channel, joining it if required.
 */
export const channel = (channelName: string): ChannelInterface => {
    if (channelName in channels) return channels[channelName].interface;
    logDebug('New Channel - ' + channelName);
    let newChannel: Channel = new Channel(channelName);
    channels[channelName] = newChannel;
    //Only send join request if we have a connection, as the connection process will also handle joins
    if (connectionStatus === ConnectionStates.connected) sendSystemMessage('joinChannels', channelName);
    return newChannel.interface;
}

//region Event Processing

/**
 * Register a callback to be notified when the active player changes
 * Will be called with (playerDbref, playerName).
 */
export const onPlayerChanged = (callback: PlayerChangedCallback) => {
    playerChangedCallbacks.push(callback);
}

/**
 * Register a callback to be notified when there's an error
 */
export const onError = (callback: ConnectionErrorCallback) => {
    connectionErrorCallbacks.push(callback);
}

/**
 * Registers a new callback that'll be informed of changes to the connection status.
 * The passed callback will immediately be called with the present status too.
 */
export const onStatusChanged = (callback: ConnectionStatusCallback): void => {
    connectionStatusChangedCallbacks.push(callback);
    callback(connectionStatus);
}

/**
 * Called by present connection
 */
export const updateAndDispatchPlayer = (newDbref: number | null, newName: string | null): void => {
    if (playerDbref === newDbref && playerName === newName) return;
    playerDbref = newDbref;
    playerName = newName;
    logDebug("Player changed: " + newName + '(' + newDbref + ')');
    for (let i = 0, maxi = playerChangedCallbacks.length; i < maxi; i++) {
        try {
            playerChangedCallbacks[i](newDbref, newName);
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
    for (let i = 0, maxi = connectionStatusChangedCallbacks.length; i < maxi; i++) {
        try {
            connectionStatusChangedCallbacks[i](newStatus);
        } catch (e) {
        }
    }
};

/**
 * Called when there's an error
 */
const dispatchError = (error: string): void => {
    logError("ERROR: " + error);
    for (let i = 0, maxi = connectionErrorCallbacks.length; i < maxi; i++) {
        try {
            connectionErrorCallbacks[i](error);
        } catch (e) {
        }
    }
}
//endregion Event Processing

//region External functions for library specifically

/**
 * Name of the present player. Empty string if no player.
 */
export const getPlayerName = (): string | null => {
    return playerName;
}

/**
 * Dbref of player represented as a number. -1 if no player.
 */
export const getPlayerDbref = (): number | null => {
    return playerDbref;
}

/**
 * Utility function to return whether a player exists
 */
export const isPlayerSet = (): boolean => {
    return playerDbref !== null;
}

/**
 * Returns the present connection state.
 * One of: connecting, login, connected, failed
 */
export const getConnectionState = (): ConnectionStates => {
    return connectionStatus;
}

//endregion External functions for library specifically