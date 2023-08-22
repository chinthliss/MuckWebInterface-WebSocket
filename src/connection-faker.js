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
/**
 * A fake connection for testing purposes
 */
var ConnectionFaker = /** @class */ (function (_super) {
    __extends(ConnectionFaker, _super);
    function ConnectionFaker(options) {
        if (options === void 0) { options = {}; }
        return _super.call(this, options) || this;
    }
    ConnectionFaker.prototype.connect = function () {
        (0, core_1.updateAndDispatchStatus)(defs_1.ConnectionStates.connected);
        (0, core_1.updateAndDispatchPlayer)(1, 'TestPlayer');
    };
    ConnectionFaker.prototype.sendString = function (stringToSend) {
        //Reflect anything that has 'reflect' as the message
        var _a = stringToSend.split(',', 3), channel = _a[0], message = _a[1], data = _a[2];
        if (message === 'reflect') {
            channel = channel.slice(3);
            (0, core_1.receivedStringFromConnection)('MSG' + channel + ',reflected,' + data);
        }
    };
    return ConnectionFaker;
}(connection_1.default));
exports.default = ConnectionFaker;
