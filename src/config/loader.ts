import { cosmiconfig } from 'cosmiconfig';
import path from 'path';
import type { ResolvedConfig, RuleCategory, Severity, UserConfig } from '../types.js';
import { PACKAGE_VERSION } from '../version.js';

const DEFAULT_INCLUDE = ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx', '**/*.mjs', '**/*.cjs'];

const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
  '**/.turbo/**',
  '**/*.min.js',
  '**/*.bundle.js',
  '**/*.generated.*',
  '**/__generated__/**',
];

const DEFAULT_IGNORE_PATTERNS: string[] = [];

const DEFAULT_CATEGORIES: Record<RuleCategory, boolean> = {
  'ai-slop': true,
  security: true,
  reliability: true,
  maintainability: true,
  'production-readiness': true,
};

const DEFAULT_MAX_ISSUES: Partial<Record<Severity, number>> = {};

function computeGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export { computeGrade };

export async function loadConfig(cwd: string, configPath?: string): Promise<ResolvedConfig> {
  const explorer = cosmiconfig('clean-slop', {
    searchPlaces: [
      'clean-slop.config.js',
      'clean-slop.config.ts',
      'clean-slop.config.mjs',
      'clean-slop.config.cjs',
      '.clean-slop.js',
      '.clean-slop.json',
      '.clean-slop.yaml',
      '.clean-slop.yml',
      'package.json',
    ],
    packageProp: 'clean-slop',
  });

  let userConfig: UserConfig = {};

  try {
    const result = configPath ? await explorer.load(configPath) : await explorer.search(cwd);

    if (result && !result.isEmpty) {
      userConfig = result.config as UserConfig;
    }
  } catch {
    // No config found; proceed with defaults
  }

  return resolveConfig(userConfig, cwd);
}

export function resolveConfig(userConfig: UserConfig, cwd: string): ResolvedConfig {
  return {
    root: path.resolve(cwd),
    version: PACKAGE_VERSION,
    include: userConfig.include ?? DEFAULT_INCLUDE,
    exclude: userConfig.exclude ?? DEFAULT_EXCLUDE,
    categories: {
      ...DEFAULT_CATEGORIES,
      ...userConfig.categories,
    },
    rules: userConfig.rules ?? {},
    failThreshold: userConfig.failThreshold ?? 70,
    maxIssues: {
      ...DEFAULT_MAX_ISSUES,
      ...userConfig.maxIssues,
    },
    plugins: userConfig.plugins ?? [],
    reporter: userConfig.reporter ?? 'text',
    output: userConfig.output ?? null,
    verbose: userConfig.verbose ?? false,
    ignorePatterns: userConfig.ignorePatterns ?? DEFAULT_IGNORE_PATTERNS,
    tsConfigPath: userConfig.tsConfigPath ?? null,
  };
}

export function generateDefaultConfig(): string {
  return `/** @type {import('clean-slop').UserConfig} */
export default {
  // Files to include in scanning
  include: [
    '**/*.js',
    '**/*.jsx',
    '**/*.ts',
    '**/*.tsx',
    '**/*.mjs',
    '**/*.cjs',
  ],

  // Files to exclude from scanning
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/coverage/**',
    '**/*.min.js',
    '**/*.generated.*',
    '**/__generated__/**',
  ],

  // Enable or disable entire rule categories
  categories: {
    'ai-slop': true,
    'security': true,
    'reliability': true,
    'maintainability': true,
    'production-readiness': true,
  },

  // Per-rule severity overrides or 'off' to disable
  rules: {
    // 'security/hardcoded-secrets': 'critical',
    // 'ai-slop/empty-catch': 'off',
  },

  // Minimum overall score before CI fails (0-100)
  failThreshold: 70,

  // Maximum allowed issues per severity
  maxIssues: {
    critical: 0,
    high: 5,
  },

  // Output reporter: 'text' | 'json' | 'html' | 'markdown' | 'sarif'
  reporter: 'text',

  // Output file path (null = stdout)
  // output: './reports/clean-slop-report.html',

  // Additional ignore patterns
  ignorePatterns: [],
};
`;
}
