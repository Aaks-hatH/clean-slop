/**
 * clean-slop - Production Readiness Engine
 *
 * Public JavaScript/TypeScript API.
 *
 * @example
 * ```typescript
 * import { scanDirectory, loadConfig } from 'clean-slop';
 *
 * const config = await loadConfig(process.cwd());
 * const result = await scanDirectory(process.cwd(), config);
 *
 * console.log(`Score: ${result.score.overall}/100`);
 * console.log(`Issues: ${result.issues.length}`);
 * ```
 */

export type {
  Issue,
  IssueFix,
  Location,
  FileResult,
  ScanResult,
  ScanScore,
  CategoryScore,
  Rule,
  RuleMeta,
  RuleContext,
  Plugin,
  Reporter,
  UserConfig,
  ResolvedConfig,
  Severity,
  Confidence,
  RuleCategory,
  Language,
  ParsedFile,
} from './types.js';

export { loadConfig, resolveConfig, generateDefaultConfig } from './config/loader.js';
export { scan, discoverFiles } from './scanners/scanner.js';
export { RuleEngine, BUILT_IN_RULES } from './rules/index.js';
export { generate as generateReport, writeReport } from './reporters/index.js';
export { parseFile, parseSource, ParseError, extractSnippet } from './parsers/source-parser.js';
export { PACKAGE_VERSION as version } from './version.js';

/**
 * Convenience: scan a directory and return the full result.
 */
export async function scanDirectory(
  directory: string,
  userConfig?: import('./types.js').UserConfig,
): Promise<import('./types.js').ScanResult> {
  const { loadConfig } = await import('./config/loader.js');
  const { resolveConfig } = await import('./config/loader.js');
  const { scan } = await import('./scanners/scanner.js');

  const config = userConfig
    ? resolveConfig(userConfig, directory)
    : await loadConfig(directory);

  return scan({ config });
}
