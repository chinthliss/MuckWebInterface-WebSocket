import Core from './core.js';

interface ChannelInterface {
    name: string;
}

export default class Channel {

    /**
     * This channel's name
     * @type {string}
     */
    public readonly name:string;

    /**
     * Link back to the core for communication
     * @type {Core}
     */
    private readonly core:Core;

    /**
     * Collection of callbacks, indexed by the message they respond to
     * @type {Object.<string, function[]>}
     */
    private callbacks: {[message:string]: (a:string, b:any, c?:boolean) => void}[] = [];

    /**
     * Callbacks that will receive any message
     * @type {function[]}
     */
    private monitors: void[] = [];

    /**
     * The public interface that will be passed back to the calling page
     * @type {ChannelInterface}
     */
    private interface: ChannelInterface;

    /**
     * Used so we can capture and buffer messages to a channel that are sent before the join command completes
     * @type {boolean}
     */
    joined:boolean = false;



    constructor(channelName: string, core:Core) {
        if (!channelName) throw "Attempt to create channel with an empty channelName.";
        this.name = channelName;
        this.core = core;
        this.interface = this.createInterface();
    }

    receiveMessage(message: string, data: any): void {
        for (let i = 0, maxi = this.monitors.length; i < maxi; i++) {
            setTimeout(() => {
                this.monitors[i](message, data, false);
            });
        }
        if (Array.isArray(this.callbacks[message])) {
            for (let i = 0, maxi = this.callbacks[message].length; i < maxi; i++) {
                setTimeout(() => {
                    this.callbacks[message][i](data);
                });
            }
        }
    }

    private createInterface(): ChannelInterface {
        return {
            name: 'wip'
        }
    }


}