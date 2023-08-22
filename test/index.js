"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vitest_1 = require("vitest");
var index_js_1 = require("../src/index.js");
(0, vitest_1.test)('Core', function () {
    (0, vitest_1.expect)(index_js_1.default.init).toBeTypeOf('function');
    (0, vitest_1.expect)(index_js_1.default.init).toHaveReturned();
});
