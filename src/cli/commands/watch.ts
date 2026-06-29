import path from 'path';
import fs from 'fs';
import process from 'process';
import { loadConfig } from '../../config/loader.js';
import { scan } from '../../scanners/scanner.js';
import { generateTextReport } from '../../reporters/text-reporter.js';
import { BOLD, CYAN, DIM, GREEN, RED, RESET, YELLOW } from '../../utils/constants.js';

export interface WatchCommandOptions {
  config?: string;
  verbose?: boolean;
}

const DEBOUNCE_MS = 500;

export async function runWatch(
  directory: string | undefined,
  options: WatchCommandOptions,
): Promise<void> {
  const cwd = directory ? path.resolve(directory) : process.cwd();
  const config = await loadConfig(cwd, options.config);

  if (options.verbose) config.verbose = true;

  console.log(
    `\n${BOLD}clean-slop watch${RESET}  ${DIM}Watching ${cwd}${RESET}`,
  );
  console.log(`${DIM}Press Ctrl+C to stop.${RESET}\n`);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let running = false;

  async function runScanCycle(changedFile?: string): Promise<void> {
    if (running) return;
    running = true;

    if (changedFile) {
      const rel = path.relative(cwd, changedFile);
      console.log(`${CYAN}Changed:${RESET} ${rel}`);
    }

    const startMsg = `${DIM}Scanning...${RESET}`;
    process.stdout.write(startMsg);

    try {
      const result = await scan({ config });
      process.stdout.write('\r\x1b[K');

      const report = generateTextReport(result);
      console.log(report);

      if (result.score.productionReady) {
        console.log(`${GREEN}Score: ${result.score.overall}/100${RESET}\n`);
      } else {
        console.log(`${RED}Score: ${result.score.overall}/100${RESET}\n`);
      }
    } catch (err) {
      process.stdout.write('\r\x1b[K');
      console.error(
        `${RED}Scan error:${RESET} ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    running = false;
  }

  // Initial scan
  await runScanCycle();

  // Watch for changes
  const watcher = fs.watch(
    cwd,
    { recursive: true },
    (event, filename) => {
      if (!filename) return;

      // Filter to JS/TS files only
      if (!/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(filename)) return;

      // Skip excluded paths
      if (
        filename.includes('node_modules') ||
        filename.includes('dist') ||
        filename.includes('.next')
      ) return;

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void runScanCycle(path.join(cwd, filename));
      }, DEBOUNCE_MS);
    },
  );

  process.on('SIGINT', () => {
    watcher.close();
    console.log(`\n${DIM}Watch stopped.${RESET}\n`);
    process.exit(0);
  });

  // Keep process alive
  await new Promise<void>(() => {});
}
