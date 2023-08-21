import {
    logDebug,
    logError,
    updateAndDispatchStatus,
    updateAndDispatchPlayer,
    handleConnectionFailure,
    receivedString
} from "./core";
import {ConnectionStates} from "./defs";
import Connection from "./connection";
import axios, {AxiosInstance} from "axios";

export interface ConnectionWebsocketOptions {
    websocketUrl?: string;
    authenticationUrl?: string;
}

/**
 * Handles the underlying websocket connection
 */
export default class ConnectionWebSocket extends Connection {

    /**
     * In case we're outdated and need a refresh.
     * @type {number}
     */
    protocolVersion: number = 1;

    /**
     * @type {string}
     */
    authenticationUrl: string;

    /**
     * @type {string}
     */
    websocketUrl: string;

    /**
     * @type {WebSocket | null}
     */
    connection: WebSocket | null = null;

    /**
     * @type {boolean}
     */
    receivedWelcome: boolean = false;

    /**
     * @type {boolean}
     */
    handshakeCompleted: boolean = false;

    ensureConnectionTimeout: ReturnType<typeof setTimeout> | null = null;

    /**
     * Used to hold messages that try to send before the initial connection is complete
     * @type {string[]}
     */
    connectingOutgoingMessageBuffer: string[] = [];

    /**
     * Our own Axios instance, so we don't interfere/fight with a hosting pages interceptors
     * @type {AxiosInstance}
     */
    axiosInstance: AxiosInstance;

    /**
     * @param {object} options
     */
    constructor(options: ConnectionWebsocketOptions = {}) {
        super(options);

        if (!options.websocketUrl || !options.authenticationUrl) throw "Missing mandatory options from MwiWebsocket configuration";

        this.axiosInstance = axios.create();

        // Calculate where we're connecting to
        this.websocketUrl = options.websocketUrl;
        this.authenticationUrl = options.authenticationUrl;

        // Add parameters to Url
        this.websocketUrl += '?protocolVersion=' + this.protocolVersion;
    }

    clearConnectionTimeoutIfSet = () => {
        if (this.ensureConnectionTimeout) {
            clearTimeout(this.ensureConnectionTimeout);
            this.ensureConnectionTimeout = null;
        }
    };

    /**
     * @param {CloseEvent} e
     */
    handleWebSocketClose = (e: CloseEvent) => {
        logDebug("WebSocket closed: " + (e.reason ? e.reason : 'No reason given.'));
        console.log(e);
        this.clearConnectionTimeoutIfSet();
        handleConnectionFailure("Websocket closed with " + (e.reason ? "reason: " + e.reason : "no reason given."));
    };

    /**
     * @param {Event} e
     */
    handleWebSocketError = (e: Event) => {
        logError('An error occurred with the websocket: ' + e)
        console.log(e);
        this.clearConnectionTimeoutIfSet();
        handleConnectionFailure("Websocket returned error: " + e);
    }

    /**
     * @param {MessageEvent} e
     */
    handleWebSocketMessage = (e: MessageEvent) => {
        let message = e.data.slice(0, -2); //Remove \r\n
        receivedString(message);
    }

    openWebsocket(websocketToken: string) {
        logDebug("Opening websocket");
        updateAndDispatchStatus(ConnectionStates.connecting);

        this.connection = new WebSocket(this.websocketUrl, 'mwi');
        this.connection.onopen = () => {
            this.receivedWelcome = false;
            this.handshakeCompleted = false;
            this.connectingOutgoingMessageBuffer = [];
            this.ensureConnectionTimeout = setTimeout(function () {
                logError('WebSocket took too long to complete handshake, assuming failure.');
                handleConnectionFailure("Websocket took too long to connect.");
            }.bind(this), 10000);
        };

        this.connection.onclose = this.handleWebSocketClose;
        this.connection.onerror = this.handleWebSocketError;

        // During connection, we use a special onMessage handling to deal with the handshake
        this.connection.onmessage = (e) => {
            if (!this.connection) return; // Don't react if we disconnected
            let message = e.data.slice(0, -2); //Remove \r\n

            if (!this.receivedWelcome) {
                if (message === 'welcome') {
                    this.connection.send('auth ' + websocketToken + ' ' + location.href);
                    this.receivedWelcome = true;
                    logDebug("WebSocket received initial welcome message, attempting to authenticate.");
                } else logError("WebSocket got an unexpected message whilst expecting welcome: " + message);
                return;
            }

            if (!this.handshakeCompleted) {
                if (message.startsWith('accepted ')) {
                    logDebug("WebSocket received descr.");
                    let [descr, playerDbref, playerName] = message.slice(9).split(',');
                    playerDbref = parseInt(playerDbref);

                    logDebug("Server acknowledged us connected as descr: "
                        + descr + ", playerDbref: " + playerDbref + ", playerName: " + playerName);

                    this.clearConnectionTimeoutIfSet();
                    this.handshakeCompleted = true;
                    // Switch the message handler to the proper one
                    this.connection.onmessage = this.handleWebSocketMessage;
                    updateAndDispatchStatus(ConnectionStates.connected);
                    updateAndDispatchPlayer(playerDbref, playerName);
                    //Resend anything that was buffered
                    for (let i = 0; i++; i < this.connectingOutgoingMessageBuffer.length) {
                        this.sendString(this.connectingOutgoingMessageBuffer[i]);
                    }
                    this.connectingOutgoingMessageBuffer = [];
                    return;
                }
                if (message === 'invalidtoken') {
                    handleConnectionFailure("Server refused authentication token.");
                    return;
                }
                logError("WebSocket got an unexpected message whilst expecting descr: " + message);
                return;
            }
            logError("Unexpected message during login: " + message);
        }
    }

    connect() {
        if (this.connection && this.connection.readyState < 2) {
            console.log(this.connection);
            logDebug("Attempt to connect whilst socket already connecting.");
            return;
        }

        //Step 1 - we need to get an authentication token from the webpage
        let websocketToken: string;
        logDebug("Requesting authentication token from webpage");
        this.axiosInstance.get(this.authenticationUrl)
            .then((response) => {
                websocketToken = response.data;
                //Step 2 - connect to the websocket and throw the token at it
                this.openWebsocket(websocketToken);
            })
            .catch((error) => {
                logError("Failed to get an authentication token from the webpage. Error was:" + error);
                handleConnectionFailure("Couldn't authenticate");
            });
    }

    disconnect() {
        logDebug(this.connection !== null ? "Closing websocket." : "No websocket to close.");
        if (this.connection !== null) this.connection.close(1000, "Disconnected");
        this.connection = null;
    }

    sendString(stringToSend: string) {
        if (!this.connection) {
            logDebug("Couldn't send message (and not buffering) due to being in connected state: " + stringToSend);
            return;
        }
        if (stringToSend.length > 30000) {
            logError("Websocket had to abort sending a string because it's over 30,000 characters.");
            return;
        }
        // Buffer the string if we're still connecting
        if (!this.receivedWelcome || !this.handshakeCompleted) {
            logDebug("Buffering outgoing message: " + stringToSend);
            return;
        }
        this.connection.send(stringToSend);
    }

}