"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionStates = exports.InitialMode = void 0;
// Pretty much just here so that it can be replaced if required
exports.InitialMode = import.meta.env.MODE;
var ConnectionStates;
(function (ConnectionStates) {
    ConnectionStates["disconnected"] = "disconnected";
    ConnectionStates["connecting"] = "connecting";
    ConnectionStates["connected"] = "connected";
    ConnectionStates["disabled"] = "disabled"; // For when no more attempts will happen
})(ConnectionStates || (exports.ConnectionStates = ConnectionStates = {}));
