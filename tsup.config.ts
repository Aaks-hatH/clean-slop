import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: false,
    splitting: false,
    treeshake: true,
    target: 'node18',
    platform: 'node',
    external: [],
  },
  {
    entry: {
      'cli/bin': 'src/cli/bin.ts',
      'cli/index': 'src/cli/index.ts',
    },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: false,
    splitting: false,
    treeshake: true,
    target: 'node18',
    platform: 'node',
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
