import path from 'path';
import fs from 'fs/promises';
import process from 'process';
import { generateDefaultConfig } from '../../config/loader.js';
import { GREEN, RED, RESET, YELLOW, BOLD } from '../../utils/constants.js';

export interface InitCommandOptions {
  force?: boolean;
}

export async function runInit(options: InitCommandOptions): Promise<void> {
  const cwd = process.cwd();
  const configPath = path.join(cwd, 'clean-slop.config.js');

  try {
    await fs.access(configPath);
    // File exists
    if (!options.force) {
      console.log(
        `${YELLOW}clean-slop.config.js already exists.${RESET} ` +
          `Use ${BOLD}--force${RESET} to overwrite it.`,
      );
      process.exit(1);
    }
  } catch {
    // File does not exist — proceed
  }

  const content = generateDefaultConfig();

  try {
    await fs.writeFile(configPath, content, 'utf-8');
    console.log(`${GREEN}Created clean-slop.config.js${RESET}`);
    console.log(`${RESET}Edit it to customize rules, categories, and thresholds.\n`);
  } catch (err) {
    console.error(
      `${RED}Failed to write config file: ${err instanceof Error ? err.message : String(err)}${RESET}`,
    );
    process.exit(1);
  }
}
