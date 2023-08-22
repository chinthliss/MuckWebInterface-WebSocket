"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("./core");
var channel_interface_1 = require("./channel-interface");
var Channel = /** @class */ (function () {
    /**
     * Creates a new channel with the given name
     */
    function Channel(channelName) {
        /**
         * Collection of callbacks, indexed by the message they respond to
         */
        this.messageCallbacks = {};
        /**
         * Callbacks that will receive any message
         */
        this.monitorCallbacks = [];
        /**
         * Used so we can capture and buffer messages to a channel that are sent before the join command completes
         */
        this.joined = false;
        /**
         * Used to cache outgoing messages during joining or rejoining
         */
        this.joiningMessageBuffer = [];
        if (!channelName)
            throw "Attempt to create channel with an empty channelName.";
        this.name = channelName;
        this.interface = new channel_interface_1.default(this);
    }
    /**
     * Has this channel handle a received message
     */
    Channel.prototype.receiveMessage = function (message, data) {
        var _this = this;
        var _loop_1 = function (i, maxi) {
            setTimeout(function () {
                _this.monitorCallbacks[i](message, data, false);
            });
        };
        for (var i = 0, maxi = this.monitorCallbacks.length; i < maxi; i++) {
            _loop_1(i, maxi);
        }
        if (Array.isArray(this.messageCallbacks[message])) {
            var _loop_2 = function (i, maxi) {
                setTimeout(function () {
                    _this.messageCallbacks[message][i](data);
                });
            };
            for (var i = 0, maxi = this.messageCallbacks[message].length; i < maxi; i++) {
                _loop_2(i, maxi);
            }
        }
    };
    /**
     * Send a message via this channel
     */
    Channel.prototype.sendMessage = function (message, data) {
        var _this = this;
        if (!this.joined) {
            //If we're connecting/reconnecting, then buffer it instead
            this.joiningMessageBuffer.push([message, data]);
            return;
        }
        var _loop_3 = function (i, maxi) {
            setTimeout(function () {
                _this.monitorCallbacks[i](message, data, true);
            });
        };
        for (var i = 0, maxi = this.monitorCallbacks.length; i < maxi; i++) {
            _loop_3(i, maxi);
        }
        (0, core_1.sendChannelMessage)(this.name, message, data);
    };
    /**
     * Register a handler to react to a particular message
     */
    Channel.prototype.registerMessageHandler = function (message, handler) {
        if (!(message in this.messageCallbacks))
            this.messageCallbacks[message] = [];
        this.messageCallbacks[message].push(handler);
    };
    /**
     * Register a new handler to see ALL communication
     */
    Channel.prototype.registerMonitorHandler = function (handler) {
        this.monitorCallbacks.push(handler);
    };
    /**
     * Used to notify the channel it's been connected
     */
    Channel.prototype.channelConnected = function () {
        this.joined = true;
        for (var i = 0, maxi = this.joiningMessageBuffer.length; i < maxi; i++) {
            var bufferedMessage = this.joiningMessageBuffer[i];
            this.sendMessage(bufferedMessage[0], bufferedMessage[1]);
        }
    };
    /**
     * Used to notify the channel it's been disconnected
     */
    Channel.prototype.channelDisconnected = function () {
        this.joined = false;
    };
    /**
     * Get whether the channel is presently joined
     */
    Channel.prototype.isChannelJoined = function () {
        return this.joined;
    };
    return Channel;
}());
exports.default = Channel;
