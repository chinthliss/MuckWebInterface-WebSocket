"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("./core");
var defs_1 = require("./defs");
var connection_1 = require("./connection");
var axios_1 = require("axios");
/**
 * Handles the underlying websocket connection
 */
var ConnectionWebSocket = /** @class */ (function (_super) {
    __extends(ConnectionWebSocket, _super);
    /**
     * Constructor
     */
    function ConnectionWebSocket(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this, options) || this;
        /**
         * In case we're outdated and need a refresh.
         */
        _this.protocolVersion = 1;
        /**
         * The websocket
         */
        _this.connection = null;
        /**
         * Used as part of the handshake
         */
        _this.handshakeReceivedWelcome = false;
        /**
         * Used as part of the handshake
         */
        _this.handshakeCompleted = false;
        /**
         *  Use as part of the handshake
         */
        _this.handshakeTimeout = null;
        /**
         * Used to hold messages that tried to send before the initial connection is complete
         */
        _this.connectingOutgoingMessageBuffer = [];
        _this.clearHandshakeTimeoutIfSet = function () {
            if (_this.handshakeTimeout) {
                clearTimeout(_this.handshakeTimeout);
                _this.handshakeTimeout = null;
            }
        };
        /**
         * Called internally to handle connection closes from the websocket
         */
        _this.handleWebSocketClose = function (e) {
            (0, core_1.logDebug)("WebSocket closed: " + (e.reason ? e.reason : 'No reason given.'));
            console.log(e);
            _this.clearHandshakeTimeoutIfSet();
            (0, core_1.handleConnectionFailure)("Websocket closed with " + (e.reason ? "reason: " + e.reason : "no reason given."));
        };
        /**
         * Called internally to handle errors from the websocket
         */
        _this.handleWebSocketError = function (e) {
            (0, core_1.logError)('An error occurred with the websocket: ' + e);
            console.log(e);
            _this.clearHandshakeTimeoutIfSet();
            (0, core_1.handleConnectionFailure)("Websocket returned error: " + e);
        };
        /**
         * Internal handler for capturing messages from the websocket
         */
        _this.handleWebSocketMessage = function (e) {
            var message = e.data.slice(0, -2); //Remove \r\n
            (0, core_1.receivedStringFromConnection)(message);
        };
        if (!options.websocketUrl || !options.authenticationUrl)
            throw "Missing mandatory options from MwiWebsocket configuration";
        _this.axiosInstance = axios_1.default.create();
        // Calculate where we're connecting to
        _this.websocketUrl = options.websocketUrl;
        _this.authenticationUrl = options.authenticationUrl;
        // Add parameters to Url
        _this.websocketUrl += '?protocolVersion=' + _this.protocolVersion;
        return _this;
    }
    ConnectionWebSocket.prototype.openWebsocket = function (websocketToken) {
        var _this = this;
        (0, core_1.logDebug)("Opening websocket");
        (0, core_1.updateAndDispatchStatus)(defs_1.ConnectionStates.connecting);
        this.connection = new WebSocket(this.websocketUrl, 'mwi');
        this.connection.onopen = function () {
            _this.handshakeReceivedWelcome = false;
            _this.handshakeCompleted = false;
            _this.connectingOutgoingMessageBuffer = [];
            _this.handshakeTimeout = setTimeout(function () {
                (0, core_1.logError)('WebSocket took too long to complete handshake, assuming failure.');
                (0, core_1.handleConnectionFailure)("Websocket took too long to connect.");
            }.bind(_this), 10000);
        };
        this.connection.onclose = this.handleWebSocketClose;
        this.connection.onerror = this.handleWebSocketError;
        // During connection, we use a special onMessage handling to deal with the handshake
        this.connection.onmessage = function (e) {
            if (!_this.connection)
                return; // Don't react if we disconnected
            var message = e.data.slice(0, -2); //Remove \r\n
            if (!_this.handshakeReceivedWelcome) {
                if (message === 'welcome') {
                    _this.connection.send('auth ' + websocketToken + ' ' + location.href);
                    _this.handshakeReceivedWelcome = true;
                    (0, core_1.logDebug)("WebSocket received initial welcome message, attempting to authenticate.");
                }
                else
                    (0, core_1.logError)("WebSocket got an unexpected message whilst expecting welcome: " + message);
                return;
            }
            if (!_this.handshakeCompleted) {
                if (message.startsWith('accepted ')) {
                    (0, core_1.logDebug)("WebSocket received descr.");
                    var _a = message.slice(9).split(','), descr = _a[0], playerDbref = _a[1], playerName = _a[2];
                    playerDbref = parseInt(playerDbref);
                    (0, core_1.logDebug)("Server acknowledged us connected as descr: "
                        + descr + ", playerDbref: " + playerDbref + ", playerName: " + playerName);
                    _this.clearHandshakeTimeoutIfSet();
                    _this.handshakeCompleted = true;
                    // Switch the message handler to the proper one
                    _this.connection.onmessage = _this.handleWebSocketMessage;
                    (0, core_1.updateAndDispatchStatus)(defs_1.ConnectionStates.connected);
                    (0, core_1.updateAndDispatchPlayer)(playerDbref, playerName);
                    //Resend anything that was buffered
                    for (var i = 0; i++; i < _this.connectingOutgoingMessageBuffer.length) {
                        _this.sendString(_this.connectingOutgoingMessageBuffer[i]);
                    }
                    _this.connectingOutgoingMessageBuffer = [];
                    return;
                }
                if (message === 'invalidtoken') {
                    (0, core_1.handleConnectionFailure)("Server refused authentication token.");
                    return;
                }
                (0, core_1.logError)("WebSocket got an unexpected message whilst expecting descr: " + message);
                return;
            }
            (0, core_1.logError)("Unexpected message during login: " + message);
        };
    };
    /**
     * Starts the websocket up and connects it.
     * Will fail if the websocket is already active.
     */
    ConnectionWebSocket.prototype.connect = function () {
        var _this = this;
        if (this.connection) {
            (0, core_1.logDebug)("Attempt to connect websocket when it's already active.");
            return;
        }
        //Step 1 - we need to get an authentication token from the webpage
        var websocketToken;
        (0, core_1.logDebug)("Requesting authentication token from webpage");
        this.axiosInstance.get(this.authenticationUrl)
            .then(function (response) {
            websocketToken = response.data;
            //Step 2 - connect to the websocket and throw the token at it
            _this.openWebsocket(websocketToken);
        })
            .catch(function (error) {
            (0, core_1.logError)("Failed to get an authentication token from the webpage. Error was:" + error);
            (0, core_1.handleConnectionFailure)("Couldn't authenticate");
        });
    };
    /**
     * Disconnects the websocket and tidies it up
     */
    ConnectionWebSocket.prototype.disconnect = function () {
        (0, core_1.logDebug)(this.connection !== null ? "Closing websocket." : "No websocket to close.");
        if (this.connection !== null)
            this.connection.close(1000, "Disconnected");
        this.connection = null;
    };
    /**
     * Send a string over the websocket
     */
    ConnectionWebSocket.prototype.sendString = function (stringToSend) {
        if (!this.connection) {
            (0, core_1.logDebug)("Couldn't send message (and not buffering) due to being in an unconnected state: " + stringToSend);
            return;
        }
        if (stringToSend.length > 30000) {
            (0, core_1.logError)("Websocket had to abort sending a string because it's over 30,000 characters.");
            return;
        }
        // Buffer the string if we're still connecting
        if (!this.handshakeReceivedWelcome || !this.handshakeCompleted) {
            (0, core_1.logDebug)("Buffering outgoing message: " + stringToSend);
            this.connectingOutgoingMessageBuffer.push(stringToSend);
            return;
        }
        this.connection.send(stringToSend);
    };
    return ConnectionWebSocket;
}(connection_1.default));
exports.default = ConnectionWebSocket;
