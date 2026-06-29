import path from 'path';
import process from 'process';
import { loadConfig } from '../../config/loader.js';
import { scan } from '../../scanners/scanner.js';
import { GREEN, RED, RESET, BOLD, DIM } from '../../utils/constants.js';

export interface CheckCommandOptions {
  config?: string;
  failThreshold?: string;
  maxCritical?: string;
}

export async function runCheck(
  directory: string | undefined,
  options: CheckCommandOptions,
): Promise<void> {
  const cwd = directory ? path.resolve(directory) : process.cwd();
  const baseConfig = await loadConfig(cwd, options.config);

  const config = {
    ...baseConfig,
    failThreshold: options.failThreshold
      ? parseInt(options.failThreshold, 10)
      : baseConfig.failThreshold,
    verbose: false,
  };

  if (options.maxCritical !== undefined) {
    config.maxIssues = {
      ...config.maxIssues,
      critical: parseInt(options.maxCritical, 10),
    };
  }

  const result = await scan({ config });

  const criticalCount = result.issues.filter((i) => i.severity === 'critical').length;
  const maxCritical = config.maxIssues.critical ?? 0;
  const criticalExceeded = criticalCount > maxCritical;
  const scorePassed = result.score.overall >= config.failThreshold;
  const passed = scorePassed && !criticalExceeded;

  if (passed) {
    console.log(
      `${GREEN}${BOLD}PASS${RESET}  Score: ${result.score.overall}/100  Grade: ${result.score.grade}  ` +
        `${DIM}(threshold: ${config.failThreshold})${RESET}`,
    );
    process.exit(0);
  } else {
    const reasons: string[] = [];
    if (!scorePassed) {
      reasons.push(
        `score ${result.score.overall} below threshold ${config.failThreshold}`,
      );
    }
    if (criticalExceeded) {
      reasons.push(
        `${criticalCount} critical issue${criticalCount !== 1 ? 's' : ''} (max: ${maxCritical})`,
      );
    }

    console.error(
      `${RED}${BOLD}FAIL${RESET}  Score: ${result.score.overall}/100  Grade: ${result.score.grade}`,
    );
    for (const reason of reasons) {
      console.error(`  ${RED}${reason}${RESET}`);
    }
    process.exit(1);
  }
}
