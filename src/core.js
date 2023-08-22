"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAndDispatchStatus = exports.updateAndDispatchPlayer = exports.onStatusChanged = exports.onError = exports.onPlayerChanged = exports.init = exports.sendChannelMessage = exports.receivedStringFromConnection = exports.handleConnectionFailure = exports.setDebug = exports.logDebug = exports.logError = void 0;
var connection_faker_1 = require("./connection-faker");
var connection_websocket_1 = require("./connection-websocket");
var defs_1 = require("./defs");
/**
 * Message in the form MSG<Channel>,<Message>,<Data>
 */
var msgRegExp = /MSG(.*?),(.*?),(.*)/;
/**
 * System message in the form SYS<Message>,<Data>
 */
var sysRegExp = /SYS(.*?),(.*?),(.*)/;
/**
 * Present mode we're operating in
 */
var mode = "production";
/**
 * Whether we can use local storage. Set in initialization.
 */
var localStorageAvailable = false;
/**
 * Present connection status
 */
var connectionStatus = defs_1.ConnectionStates.disconnected;
/**
 * Present player's database reference or null
 */
var playerDbref = null;
/**
 * Present player's name or null
 */
var playerName = null;
/**
 * Callbacks to be notified when the player gets changed
 */
var playerChangedCallbacks = [];
/**
 * Callbacks to be notified when the connection status gets changed
 */
var connectionStatusChangedCallbacks = [];
/**
 * Callbacks to be notified when something goes wrong
 */
var connectionErrorCallbacks = [];
/**
 * Timeout mostly used to ensure we don't have multiple connection attempts
 */
var queuedConnectionTimeout = null;
/**
 * Whether debug mode is on
 */
var debug = false;
/**
 * Our presently configured connection object
 */
var connection = null;
/**
 * A lookup list of registered channels
 */
var channels = {};
/**
 * Utility function to format errors
 */
var logError = function (message) {
    console.log("Mwi-Websocket ERROR: " + message);
};
exports.logError = logError;
/**
 * Utility function to format debug lines and omit if disabled
 */
var logDebug = function (message) {
    if (debug)
        console.log("Mwi-Websocket DEBUG: " + message);
};
exports.logDebug = logDebug;
/**
 * Enables or disables printing debug information into the console
 */
var setDebug = function (trueOrFalse) {
    if (!localStorageAvailable) {
        console.log("Can't set debug preference - local storage is not available.");
        return;
    }
    if (trueOrFalse) {
        debug = true;
        console.log("Console logging enabled.");
        localStorage.setItem('mwiWebsocket-debug', 'y');
    }
    else {
        debug = false;
        console.log("Console logging disabled.");
        localStorage.removeItem('mwiWebsocket-debug');
    }
};
exports.setDebug = setDebug;
var handleConnectionFailure = function (errorMessage) {
    throw "Not Implemented Yet";
};
exports.handleConnectionFailure = handleConnectionFailure;
/**
 * Used by the present connection to pass back a string for processing
 */
var receivedStringFromConnection = function (stringReceived) {
    throw "Not Implemented Yet";
};
exports.receivedStringFromConnection = receivedStringFromConnection;
var sendChannelMessage = function (channel, message, data) {
    throw "Not Implemented Yet";
};
exports.sendChannelMessage = sendChannelMessage;
var sendSystemMessage = function (message, data) {
    throw "Not Implemented Yet";
};
/**
 * Called by the hosting program to start everything up
 */
var init = function (options) {
    if (connection) {
        (0, exports.logError)("Attempt to run init() when initialisation has already taken place.");
        return;
    }
    // Set Environment
    mode = (options === null || options === void 0 ? void 0 : options.environment) || defs_1.InitialMode || "production";
    if (options.environment)
        mode = options.environment;
    // Previously this was a test to find something in order of self, window, global
    var context = globalThis;
    // Figure out whether we have local storage (And load debug option if so)
    localStorageAvailable = 'localStorage' in context;
    if (localStorageAvailable && localStorage.getItem('mwiWebsocket-debug') === 'y')
        debug = true;
    if (mode === 'localdevelopment')
        debug = true; // No local storage in localdev
    // Work out which connection we're using
    if (mode === 'test')
        connection = new connection_faker_1.default(options);
    if (!connection) {
        if ("WebSocket" in context) {
            // Calculate where we're connecting to
            if (context.location) {
                if (!options.websocketUrl)
                    options.websocketUrl =
                        (location.protocol === 'https:' ? 'wss://' : 'ws://') // Ensure same level of security as page
                            + location.hostname + "/mwi/ws";
                if (!options.authenticationUrl)
                    options.authenticationUrl = location.origin + '/getWebsocketToken';
            }
            connection = new connection_websocket_1.default(options);
        }
    }
    if (!connection)
        throw "Failed to find any usable connection method";
    (0, exports.logDebug)("Initialized Websocket in environment: " + mode);
    queueConnection();
};
exports.init = init;
/**
 * Used as entry point for both new connections and reconnects
 */
var queueConnection = function () {
    var delay = 0; // Leaving room to turn this into a calculation
    queuedConnectionTimeout = setTimeout(startConnection, delay);
    (0, exports.logDebug)("Connection retry queued.");
};
/**
 * Utility function to unset the connection timeout
 */
var clearConnectionTimeout = function () {
    if (queuedConnectionTimeout) {
        clearTimeout(queuedConnectionTimeout);
        queuedConnectionTimeout = null;
    }
};
/**
 * Starts connection attempts to the configured connection
 */
var startConnection = function () {
    if (!connection) {
        (0, exports.logError)("Attempt to start a connection when it hasn't been configured yet.");
        throw "Attempt to start a connection when it hasn't been configured yet.";
    }
    (0, exports.logDebug)("Starting connection.");
    clearConnectionTimeout();
    (0, exports.updateAndDispatchStatus)(defs_1.ConnectionStates.connecting);
    (0, exports.updateAndDispatchPlayer)(null, null);
    for (var channel in channels) {
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
var stopConnection = function () {
    if (!connection)
        return;
    (0, exports.logDebug)("Stopping connection.");
    clearConnectionTimeout();
    (0, exports.updateAndDispatchStatus)(defs_1.ConnectionStates.disabled);
    (0, exports.updateAndDispatchPlayer)(null, null);
    for (var channel in channels) {
        if (channels.hasOwnProperty(channel)) {
            //Channels will be re-joined if required, but we need to let them know to buffer until the muck acknowledges them.
            channels[channel].channelDisconnected();
        }
    }
    connection.disconnect();
};
//region Event Processing
/**
 * Register a callback to be notified when the active player changes
 * Will be called with (playerDbref, playerName).
 */
var onPlayerChanged = function (callback) {
    playerChangedCallbacks.push(callback);
};
exports.onPlayerChanged = onPlayerChanged;
/**
 * Register a callback to be notified when there's an error
 */
var onError = function (callback) {
    connectionErrorCallbacks.push(callback);
};
exports.onError = onError;
/**
 * Registers a new callback that'll be informed of changes to the connection status.
 * The passed callback will immediately be called with the present status too.
 */
var onStatusChanged = function (callback) {
    connectionStatusChangedCallbacks.push(callback);
    callback(connectionStatus);
};
exports.onStatusChanged = onStatusChanged;
/**
 * Called by present connection
 */
var updateAndDispatchPlayer = function (newDbref, newName) {
    if (playerDbref === newDbref && playerName === newName)
        return;
    playerDbref = newDbref;
    playerName = newName;
    (0, exports.logDebug)("Player changed: " + newName + '(' + newDbref + ')');
    for (var i = 0, maxi = playerChangedCallbacks.length; i < maxi; i++) {
        try {
            playerChangedCallbacks[i](newDbref, newName);
        }
        catch (e) {
        }
    }
};
exports.updateAndDispatchPlayer = updateAndDispatchPlayer;
/**
 * Called by present connection
 */
var updateAndDispatchStatus = function (newStatus) {
    if (connectionStatus === newStatus)
        return;
    (0, exports.logDebug)('Connection status changed to ' + newStatus + ' (from ' + connectionStatus + ')');
    connectionStatus = newStatus;
    // Maybe need to send channel join requests?
    if (newStatus === defs_1.ConnectionStates.connected) {
        var channelsToJoin = [];
        for (var channel in channels) {
            if (channels.hasOwnProperty(channel) && !channels[channel].isChannelJoined()) {
                channelsToJoin.push(channel);
            }
        }
        if (channelsToJoin.length > 0)
            sendSystemMessage('joinChannels', channelsToJoin);
    }
    //Callbacks
    for (var i = 0, maxi = connectionStatusChangedCallbacks.length; i < maxi; i++) {
        try {
            connectionStatusChangedCallbacks[i](newStatus);
        }
        catch (e) {
        }
    }
};
exports.updateAndDispatchStatus = updateAndDispatchStatus;
/**
 * Called when there's a critical error
 */
var dispatchCriticalError = function (error) {
    (0, exports.logError)("ERROR: " + error);
    for (var i = 0, maxi = connectionErrorCallbacks.length; i < maxi; i++) {
        try {
            connectionErrorCallbacks[i](error);
        }
        catch (e) {
        }
    }
};
//endregion Event Processing
