import Core from './core.js';
import ChannelInterface from "./channel-interface";

export type MessageHandlerFunction = (
    (data: any) => void
    )

export type MonitorHandlerFunction = (
    (message: string, data: any, outgoing: boolean) => void
    )

export default class Channel {

    /**
     * This channel's name
     * @type {string}
     */

    readonly name: string;

    /**
     * Link back to the core for communication
     * @type {Core}
     * @private
     */
    private readonly core: Core;

    /**
     * Collection of callbacks, indexed by the message they respond to
     * @type {Object.<string, function[]>}
     * @private
     */
    private messageCallbacks: { [message: string]: MessageHandlerFunction[] } = {};

    /**
     * Callbacks that will receive any message
     * @type function[]
     * @private
     */
    private monitorCallbacks: MonitorHandlerFunction[] = [];

    /**
     * The public interface that will be passed back to the calling page
     * @type {ChannelInterface}
     * @private
     */
    private interface: ChannelInterface;

    /**
     * Used so we can capture and buffer messages to a channel that are sent before the join command completes
     * @type {boolean}
     * @private
     */
    private joined: boolean = false;

    /**
     * Used to cache outgoing messages during joining or rejoining
     * @type {{message, data}[]}
     * @private
     */
    private joiningMessageBuffer: [message: string, data: any][] = [];


    /**
     * Creates a new channel with the given name
     * @param {string} channelName
     * @param {Core} core
     */
    constructor(channelName: string, core: Core) {
        if (!channelName) throw "Attempt to create channel with an empty channelName.";
        this.name = channelName;
        this.core = core;
        this.interface = new ChannelInterface(this);
    }

    /**
     * Has this channel handle a received message
     * @param {string} message
     * @param data
     */
    receiveMessage(message: string, data: any): void {
        for (let i = 0, maxi = this.monitorCallbacks.length; i < maxi; i++) {
            setTimeout(() => {
                this.monitorCallbacks[i](message, data, false);
            });
        }
        if (Array.isArray(this.messageCallbacks[message])) {
            for (let i = 0, maxi = this.messageCallbacks[message].length; i < maxi; i++) {
                setTimeout(() => {
                    this.messageCallbacks[message][i](data);
                });
            }
        }
    }

    /**
     * Send a message via this channel
     * @param {string} message
     * @param data
     */
    sendMessage(message: string, data: any): void {
        if (!this.joined) {
            //If we're connecting/reconnecting, then buffer it instead
            this.joiningMessageBuffer.push([message, data]);
            return;
        }
        for (let i = 0, maxi = this.monitorCallbacks.length; i < maxi; i++) {
            setTimeout(() => {
                this.monitorCallbacks[i](message, data, true);
            });
        }
        this.core.sendChannelMessage(this.name, message, data);
    }


    /**
     * Register a handler to react to a particular message
     * @param {string} message
     * @param {function} handler
     */
    registerMessageHandler(message: string, handler: MessageHandlerFunction): void {
        if (!(message in this.messageCallbacks)) this.messageCallbacks[message] = [];
        this.messageCallbacks[message].push(handler);
    }

    /**
     * Register a new handler to see ALL communication
     * @param handler
     */
    registerMonitorHandler(handler: MonitorHandlerFunction): void {
        this.monitorCallbacks.push(handler);
    }

    /**
     * Used to notify the channel it's been connected
     */
    channelConnected(): void {
        this.joined = true;
        for (let i = 0, maxi = this.joiningMessageBuffer.length; i < maxi; i++) {
            const bufferedMessage = this.joiningMessageBuffer[i];
            this.sendMessage(bufferedMessage[0], bufferedMessage[1]);
        }
    }

    /**
     * Used to notify the channel it's been disconnected
     */
    channelDisconnected(): void {
        this.joined = false;
    }
}