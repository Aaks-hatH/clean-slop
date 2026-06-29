import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { scan } from '../../src/scanners/scanner.js';
import { resolveConfig } from '../../src/config/loader.js';
import { generateTextReport } from '../../src/reporters/text-reporter.js';
import { generateJsonReport } from '../../src/reporters/json-reporter.js';
import { generateMarkdownReport } from '../../src/reporters/markdown-reporter.js';
import { generateSarifReport } from '../../src/reporters/sarif-reporter.js';
import { generateHtmlReport } from '../../src/reporters/html-reporter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '../fixtures');

describe('Full scan pipeline', () => {
  it('scans the fixtures directory and finds issues', async () => {
    const config = resolveConfig(
      {
        include: ['**/*.ts', '**/*.js'],
        exclude: [],
        verbose: false,
      },
      FIXTURES_DIR,
    );

    const result = await scan({ config });

    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.score.overall).toBeGreaterThanOrEqual(0);
    expect(result.score.overall).toBeLessThanOrEqual(100);
    expect(result.score.grade).toMatch(/^[ABCDF]$/);
    expect(result.timestamp).toBeTruthy();
    expect(result.version).toBeTruthy();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  }, 30_000);

  it('returns a structured result with all required fields', async () => {
    const config = resolveConfig({}, FIXTURES_DIR);
    const result = await scan({ config });

    expect(result).toHaveProperty('root');
    expect(result).toHaveProperty('issues');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('files');
    expect(result.score).toHaveProperty('overall');
    expect(result.score).toHaveProperty('grade');
    expect(result.score).toHaveProperty('categories');
    expect(result.score.categories).toHaveLength(5);
  }, 30_000);

  it('generates valid text report', async () => {
    const config = resolveConfig({}, FIXTURES_DIR);
    const result = await scan({ config });
    const report = generateTextReport(result);

    expect(typeof report).toBe('string');
    expect(report.length).toBeGreaterThan(0);
    expect(report).toContain('clean-slop');
  }, 30_000);

  it('generates valid JSON report', async () => {
    const config = resolveConfig({}, FIXTURES_DIR);
    const result = await scan({ config });
    const report = generateJsonReport(result);

    const parsed = JSON.parse(report) as Record<string, unknown>;
    expect(parsed).toHaveProperty('issues');
    expect(parsed).toHaveProperty('score');
  }, 30_000);

  it('generates valid Markdown report', async () => {
    const config = resolveConfig({}, FIXTURES_DIR);
    const result = await scan({ config });
    const report = generateMarkdownReport(result);

    expect(report).toContain('# clean-slop Report');
    expect(report).toContain('## Score Summary');
  }, 30_000);

  it('generates valid SARIF report', async () => {
    const config = resolveConfig({}, FIXTURES_DIR);
    const result = await scan({ config });
    const report = generateSarifReport(result);

    const sarif = JSON.parse(report) as Record<string, unknown>;
    expect(sarif).toHaveProperty('$schema');
    expect(sarif).toHaveProperty('version', '2.1.0');
    expect(sarif).toHaveProperty('runs');
  }, 30_000);

  it('generates valid HTML report', async () => {
    const config = resolveConfig({}, FIXTURES_DIR);
    const result = await scan({ config });
    const report = generateHtmlReport(result);

    expect(report).toContain('<!DOCTYPE html>');
    expect(report).toContain('clean-slop');
  }, 30_000);

  it('respects category disabling', async () => {
    const config = resolveConfig(
      {
        categories: {
          'ai-slop': false,
          'security': false,
          'reliability': false,
          'maintainability': false,
          'production-readiness': false,
        },
      },
      FIXTURES_DIR,
    );

    const result = await scan({ config });
    expect(result.issues).toHaveLength(0);
  }, 30_000);

  it('respects rule-level off override', async () => {
    const config = resolveConfig(
      {
        rules: {
          'ai-slop/empty-catch': 'off',
        },
      },
      FIXTURES_DIR,
    );

    const result = await scan({ config });
    const emptyCatchIssues = result.issues.filter((i) => i.ruleId === 'ai-slop/empty-catch');
    expect(emptyCatchIssues).toHaveLength(0);
  }, 30_000);
});
