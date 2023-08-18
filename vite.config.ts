import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
// https://vitejs.dev/guide/build.html#library-mode

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'muckwebinterface-websocket',
            fileName: 'muckwebinterface-websocket',
        },
        copyPublicDir: false
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