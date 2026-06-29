import path from 'path';
import process from 'process';
import { loadConfig } from '../../config/loader.js';
import { scan } from '../../scanners/scanner.js';
import { generate, writeReport } from '../../reporters/index.js';
import type { ReporterName } from '../../reporters/index.js';
import { GREEN, RED, RESET } from '../../utils/constants.js';

export interface ReportCommandOptions {
  config?: string;
  reporter?: string;
  output?: string;
}

export async function runReport(
  directory: string | undefined,
  options: ReportCommandOptions,
): Promise<void> {
  const cwd = directory ? path.resolve(directory) : process.cwd();
  const baseConfig = await loadConfig(cwd, options.config);

  const reporterName = (options.reporter ?? baseConfig.reporter) as ReporterName;
  const outputPath = options.output ?? baseConfig.output;

  if (!outputPath && reporterName === 'html') {
    const defaultOut = path.join(cwd, 'clean-slop-report.html');
    baseConfig.output = defaultOut;
  } else if (outputPath) {
    baseConfig.output = outputPath;
  }

  const config = { ...baseConfig, reporter: reporterName };

  console.log(`Scanning ${cwd}...`);
  const result = await scan({ config });

  const content = generate(result, reporterName);

  if (config.output) {
    await writeReport(content, config.output);
    console.log(`${GREEN}Report written to ${config.output}${RESET}`);
  } else {
    process.stdout.write(content);
  }
}
