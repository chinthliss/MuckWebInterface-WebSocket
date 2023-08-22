"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("./core");
/**
 * @borrows init as init
 * @borrows setDebug as setDebug
 * @borrows onPlayerChanged as onPlayerChanged
 * @borrows onError as onError
 * @borrows onStatusChanged as onStatusChanged
 */
var library = {
    init: core_1.init,
    setDebug: core_1.setDebug,
    onPlayerChanged: core_1.onPlayerChanged,
    onError: core_1.onError,
    onStatusChanged: core_1.onStatusChanged
};
exports.default = library;
