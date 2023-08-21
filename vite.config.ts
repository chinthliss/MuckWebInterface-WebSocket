import {resolve} from 'path';
import {defineConfig} from 'vite';
import dts from 'vite-plugin-dts';
// https://vitejs.dev/guide/build.html#library-mode

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
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
    plugins: [dts()],
    test: {
        include: [resolve(__dirname, 'test/*.ts')]
    },
    server: {
        watch: {
            usePolling: true
        }
    }
});