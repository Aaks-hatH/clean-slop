import { Command } from 'commander';
import { PACKAGE_VERSION } from '../version.js';
import { runScan } from './commands/scan.js';
import { runCheck } from './commands/check.js';
import { runWatch } from './commands/watch.js';
import { runDoctor } from './commands/doctor.js';
import { runInit } from './commands/init.js';
import { runReport } from './commands/report.js';

export { createCLI };

function createCLI(): Command {
  const program = new Command();

  program
    .name('clean-slop')
    .description(
      'Production Readiness Engine for JavaScript and TypeScript projects.\n' +
        'Prevents low-quality, insecure, and AI-generated code from reaching production.',
    )
    .version(PACKAGE_VERSION, '-v, --version', 'Print the current version')
    .helpOption('-h, --help', 'Display help information');

  // Default command: scan (also explicit)
  program
    .command('scan [directory]', { isDefault: true })
    .description('Scan a directory for issues (default command)')
    .option('-c, --config <path>', 'Path to configuration file')
    .option('--reporter <name>', 'Reporter to use: text, json, html, markdown, sarif', 'text')
    .option('-o, --output <file>', 'Write report to a file instead of stdout')
    .option('--fail-threshold <score>', 'Minimum score before exiting with code 1', '70')
    .option('--max-critical <n>', 'Maximum allowed critical issues (0 = none)', '0')
    .option('--max-high <n>', 'Maximum allowed high issues')
    .option('--no-ai-slop', 'Disable AI slop rules')
    .option('--no-security', 'Disable security rules')
    .option('--no-reliability', 'Disable reliability rules')
    .option('--no-maintainability', 'Disable maintainability rules')
    .option('--no-production-readiness', 'Disable production readiness rules')
    .option('--verbose', 'Print full issue details including snippets and fixes')
    .option('--quiet', 'Only print the score summary, suppress issue list')
    .option('--ci', 'CI mode: machine-readable exit codes, no color')
    .action(runScan);

  program
    .command('check [directory]')
    .description('Quick check: exit 0 if production ready, 1 if not')
    .option('-c, --config <path>', 'Path to configuration file')
    .option('--fail-threshold <score>', 'Minimum passing score', '70')
    .option('--max-critical <n>', 'Maximum critical issues allowed', '0')
    .action(runCheck);

  program
    .command('watch [directory]')
    .description('Watch for file changes and re-scan automatically')
    .option('-c, --config <path>', 'Path to configuration file')
    .option('--verbose', 'Print full issue details')
    .action(runWatch);

  program
    .command('report [directory]')
    .description('Generate a report from the last scan or run a fresh scan')
    .option('-c, --config <path>', 'Path to configuration file')
    .option('--reporter <name>', 'Reporter: text, json, html, markdown, sarif', 'html')
    .option('-o, --output <file>', 'Output file path')
    .action(runReport);

  program
    .command('doctor')
    .description('Diagnose the current environment, config, and installation')
    .action(runDoctor);

  program
    .command('init')
    .description('Create a clean-slop.config.js in the current directory')
    .option('--force', 'Overwrite existing config file')
    .action(runInit);

  return program;
}
