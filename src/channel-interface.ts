import Channel, {MessageHandlerFunction, MonitorHandlerFunction} from "./channel";

/**
 * The parts of a channel that will be exposed to a program using this library
 */
export default class ChannelInterface {

    /**
     * Channel that this public interface is for
     * @type {Channel} channel
     */
    private channel: Channel;

    /**
     * @param channel
     */
    constructor(channel: Channel) {
        this.channel = channel;
    }

    /**
     * @returns {string}
     */
    name(): string {
        return this.channel.name;
    }

    /**
     * @returns {string}
     */
    toString(): string {
        return "Channel[" + this.name() + "]"
    }

    /**
     * Used to register callbacks for when a given message arrives via this channel.
     * The given callback will receive whatever data the muck sends
     * @param {string} message
     * @param {function} callback
     */
    on(message: string, callback: MessageHandlerFunction) {
        if (!message || !callback) throw "Invalid Arguments";
        this.channel.registerMessageHandler(message, callback);
    }

    /**
     * Called on ANY message, mostly intended to monitor a channel in development
     * The given callback will receive (message, data, outgoing?)
     * @param {function} callback
     */
    any(callback: MonitorHandlerFunction) {
        if (!callback) throw "Invalid Arguments";
        this.channel.registerMonitorHandler(callback);
    }

    /**
     * Sends a message via this channel
     * @param {string} message
     * @param data
     */
    send(message: string, data: any) {
        if (!message) throw "Send called without a text message";
        this.channel.sendMessage(message, data);
    }
}