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
    public readonly name: string;

    /**
     * Link back to the core for communication
     * @type {Core}
     */
    private readonly core: Core;

    /**
     * Collection of callbacks, indexed by the message they respond to
     * @type {Object.<string, function[]>}
     */
    private messageCallbacks: { [message: string]: MessageHandlerFunction[] } = {};

    /**
     * Callbacks that will receive any message
     * @type function[]
     */
    private monitorCallbacks: MonitorHandlerFunction[] = [];

    /**
     * The public interface that will be passed back to the calling page
     * @type {ChannelInterface}
     */
    private interface: ChannelInterface;

    /**
     * Used so we can capture and buffer messages to a channel that are sent before the join command completes
     * @type {boolean}
     */
    joined: boolean = false;


    constructor(channelName: string, core: Core) {
        if (!channelName) throw "Attempt to create channel with an empty channelName.";
        this.name = channelName;
        this.core = core;
        this.interface = new ChannelInterface(this);
    }

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

    sendMessage(message: string, data: any): void {
        for (let i = 0, maxi = this.monitorCallbacks.length; i < maxi; i++) {
            setTimeout(() => {
                this.monitorCallbacks[i](message, data, true);
            });
        }
        this.core.sendChannelMessage(this.name, message, data);
    }

    registerMessageHandler(message: string, handler: MessageHandlerFunction): void {
        if (!(message in this.messageCallbacks)) this.messageCallbacks[message] = [];
        this.messageCallbacks[message].push(handler);
    }

    registerMonitorHandler(handler: MonitorHandlerFunction): void {
        this.monitorCallbacks.push(handler);
    }

}