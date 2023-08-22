"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var vite_1 = require("vite");
var vite_plugin_dts_1 = require("vite-plugin-dts");
// https://vitejs.dev/guide/build.html#library-mode
exports.default = (0, vite_1.defineConfig)({
    build: {
        lib: {
            entry: (0, path_1.resolve)(__dirname, 'src/index.ts'),
            name: 'muckwebinterface-websocket',
            fileName: 'muckwebinterface-websocket',
        },
        copyPublicDir: false,
        rollupOptions: {
            // make sure to externalize deps that shouldn't be bundled
            // into your library
            external: ['axios'],
            output: {
                // Provide global variables to use in the UMD build
                // for externalized deps
                globals: {
                    axios: 'axios',
                },
            },
        }
    },
    plugins: [(0, vite_plugin_dts_1.default)()],
    test: {
        include: [(0, path_1.resolve)(__dirname, 'test/*.ts')]
    },
    server: {
        watch: {
            usePolling: true
        }
    }
});
