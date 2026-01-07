import { defineConfig } from 'vite'
import { readFileSync } from 'fs'
import replace from '@rollup/plugin-replace'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
    server: {
        open: '/demo/',
        port: 8000
    },
    resolve: {
        alias: {
            tslib: 'tslib/tslib.es6.js'
        }
    },
    optimizeDeps: {
        include: ['echarts', 'zrender', 'tslib']
    },
    plugins: [
        replace({
            versionplaceholder: pkg.version,
            preventAssignment: true
        })
    ],
    build: {
        lib: {
            entry: 'src/widget-gauge.ts',
            formats: ['es'],
            fileName: 'widget-gauge'
        },
        sourcemap: true,
        rollupOptions: {
            output: {
                banner: '/* @license Copyright (c) 2025 Record Evolution GmbH. All rights reserved.*/'
            }
        }
    }
})
