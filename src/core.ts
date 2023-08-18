import Connection from "./connection";
import ConnectionFaker from "./connection-faker";
import ConnectionWebSocket from "./connection-websocket";
import Channel from "./channel";

export enum ConnectionStates {
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

export interface CoreOptions {
    environment?: string;
    websocketUrl?: string;
    authenticationUrl?: string;
}

export default class Core {

    private environment: string = "production";

    private localStorageAvailable: boolean = false;

    private connectionStatus: ConnectionStates = ConnectionStates.disconnected;

    private playerDbref: number | null = null;

    private playerName: string | null = null;

    private playerChangedHandlers: Function[] = [];

    private statusChangedHandlers: Function[] = [];

    private errorHandlers: Function[] = [];

    private queuedRetryConnectionId:number = -1;

    /**
     * Whether debug mode is on
     * @type {boolean}
      */
    debug: boolean = false;

    /**
     * Our presently configured connection object
     * @type {Connection?}
     */
    private connection: Connection | null = null;

    /**
     * A lookup list of registered channels
     * @type {Object}
     */
    channels: { [channelName: string]: Channel } = {};

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
     *
     * @param {CoreOptions} options
     */
    init(options: CoreOptions): void {

        if (this.connection) {
            this.logError("Attempt to run init() when initialisation has already taken place.");
            return;
        }

        // Set Environment
        this.environment = options?.environment || import.meta.env.MODE || "production";
        if (options.environment) this.environment = options.environment;

        // Previously this was a test to find something in order of self, window, global
        let context = globalThis;

        // Figure out whether we have local storage (And load debug option if so)
        this.localStorageAvailable = 'localStorage' in context;
        if (this.localStorageAvailable && localStorage.getItem('mwiWebsocket-debug') === 'y') this.debug = true;
        if (this.environment === 'localdevelopment') this.debug = true; // No local storage in localdev

        // Work out which connection we're using
        if (this.environment === 'test') this.connection = new ConnectionFaker(this, options);
        if (!this.connection) {
            if ("WebSocket" in context) {
                // Calculate where we're connecting to
                if (context.location) {
                    if (!options.websocketUrl) options.websocketUrl =
                        (location.protocol === 'https:' ? 'wss://' : 'ws://') // Ensure same level of security as page
                        + location.hostname + "/mwi/ws";
                    if (!options.authenticationUrl) options.authenticationUrl = location.origin + '/getWebsocketToken';
                }
                this.connection = new ConnectionWebSocket(this, options);
            }
        }
        if (!this.connection) throw "Failed to find any usable connection method";

        this.logDebug("Initialized Websocket in environment: " + this.environment);

        this.startConnection();
    }

    /**
     * Starts connection attempts to the configured connection
     */
    private startConnection() {
        if (!this.connection) {
            this.logError("Attempt to start a connection when it hasn't been configured yet.");
            throw "Attempt to start a connection when it hasn't been configured yet."
        }
        this.logDebug("Starting connection.");
        this.queuedRetryConnectionId = -1;
        this.updateAndDispatchStatus(ConnectionStates.connecting);
        this.updateAndDispatchPlayer(-1, '');
        for (let channel in this.channels) {
            if (this.channels.hasOwnProperty(channel)) {
                //Channels will be re-joined if required, but we need to let them know to buffer until the muck acknowledges them.
                this.channels[channel].channelDisconnected();
            }
        }
        this.connection.connect();
    };

}