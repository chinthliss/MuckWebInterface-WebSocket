"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * The parts of a channel that will be exposed to a program using this library
 */
var ChannelInterface = /** @class */ (function () {
    /**
     * Constructor
     */
    function ChannelInterface(channel) {
        this.channel = channel;
    }
    /**
     * Name of the channel
     */
    ChannelInterface.prototype.name = function () {
        return this.channel.name;
    };
    /**
     * String representation for this channel
     */
    ChannelInterface.prototype.toString = function () {
        return "Channel[" + this.name() + "]";
    };
    /**
     * Used to register callbacks for when a given message arrives via this channel.
     * The given callback will receive whatever data the muck sends
     */
    ChannelInterface.prototype.on = function (message, callback) {
        if (!message || !callback)
            throw "Invalid Arguments";
        this.channel.registerMessageHandler(message, callback);
    };
    /**
     * Called on ANY message, mostly intended to monitor a channel in development
     * The given callback will receive (message, data, outgoing?)
     */
    ChannelInterface.prototype.any = function (callback) {
        if (!callback)
            throw "Invalid Arguments";
        this.channel.registerMonitorHandler(callback);
    };
    /**
     * Sends a message via this channel
     */
    ChannelInterface.prototype.send = function (message, data) {
        if (!message)
            throw "Send called without a text message";
        this.channel.sendMessage(message, data);
    };
    return ChannelInterface;
}());
exports.default = ChannelInterface;
