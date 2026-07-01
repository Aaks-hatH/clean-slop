# clean-slop
[![npm version](https://img.shields.io/npm/v/clean-slop)](https://www.npmjs.com/package/clean-slop)
[![npm downloads](https://img.shields.io/npm/dm/clean-slop)](https://www.npmjs.com/package/clean-slop)
[![License](https://img.shields.io/npm/l/clean-slop)](https://github.com/Aaks-hatH/clean-slop/blob/main/LICENSE)
[![clean-slop](https://img.shields.io/badge/clean--slop-self--scanned-brightgreen)](https://github.com/Aaks-hatH/clean-slop)

**A production readiness engine for modern JavaScript and TypeScript projects.**

clean-slop answers one question: **should this code be merged into production?**

It combines AI-generated code quality analysis, static security analysis, reliability analysis, maintainability analysis, and production readiness checks into a single professional tool with a clear score and actionable output.

```bash
npm install -D clean-slop
npx clean-slop scan
```

---

## Why clean-slop

AI code generation tools produce code that passes tests and compiles cleanly but contains patterns that silently fail in production: empty catch blocks that hide errors, hardcoded secrets that get committed to version control, SQL queries built with string concatenation, debug flags left active, and validation functions that always return true.

Standard linters catch syntax errors and style violations. clean-slop catches the patterns that indicate code that was never properly reviewed, never properly secured, and was never actually intended to run in production.

---

## Features

- **22 built-in rules** across 5 categories
- **Clear production readiness score** (0–100) with letter grade
- **Multiple output formats**: terminal, JSON, HTML, Markdown, SARIF 2.1.0
- **GitHub Code Scanning integration** via SARIF upload
- **Watch mode** for continuous feedback during development
- **CI-ready exit codes** with configurable thresholds
- **Plugin architecture** for custom rules
- **Public API** for programmatic use in build tools and scripts
- **TypeScript-first** with full type definitions

---

## Installation

```bash
# As a dev dependency (recommended)
npm install -D clean-slop

# Global installation
npm install -g clean-slop

# No installation required
npx clean-slop scan
```

**Requirements:** Node.js >= 18.0.0

---

## Quick Start

**Scan the current directory:**

```bash
npx clean-slop scan
```

**Scan a specific directory:**

```bash
npx clean-slop scan ./src
```

**Generate an HTML report:**

```bash
npx clean-slop report --reporter html --output ./reports/clean-slop.html
```

**CI gate (exit 1 if not production ready):**

```bash
npx clean-slop check
```

**Initialize a config file:**

```bash
npx clean-slop init
```

---

## CLI Reference

### `clean-slop scan [directory]`

Scan a directory for issues. This is the default command.

```
Options:
  -c, --config <path>          Path to configuration file
  --reporter <name>            Reporter: text, json, html, markdown, sarif  [default: text]
  -o, --output <file>          Write report to a file instead of stdout
  --fail-threshold <score>     Minimum score before exiting with code 1  [default: 70]
  --max-critical <n>           Maximum allowed critical issues  [default: 0]
  --max-high <n>               Maximum allowed high issues
  --no-ai-slop                 Disable AI slop rules
  --no-security                Disable security rules
  --no-reliability             Disable reliability rules
  --no-maintainability         Disable maintainability rules
  --no-production-readiness    Disable production readiness rules
  --verbose                    Print full issue details including snippets and fixes
  --quiet                      Only print the score summary
  --ci                         CI mode: machine-readable output, no color
```

**Examples:**

```bash
# Scan src/ with verbose output
clean-slop scan src --verbose

# Scan and fail if any critical issues found
clean-slop scan --max-critical 0

# Output SARIF for GitHub Code Scanning
clean-slop scan --reporter sarif --output results.sarif

# Disable security rules for a legacy scan
clean-slop scan --no-security
```

---

### `clean-slop check [directory]`

Quick pass/fail check for use in CI pipelines. Prints PASS or FAIL with the score.

```
Options:
  -c, --config <path>          Path to configuration file
  --fail-threshold <score>     Minimum passing score  [default: 70]
  --max-critical <n>           Maximum critical issues allowed  [default: 0]
```

Exit codes:
- `0` — production ready (score above threshold, critical issues within limit)
- `1` — not production ready

---

### `clean-slop watch [directory]`

Watch for file changes and re-scan automatically. Useful during active development.

```bash
clean-slop watch src --verbose
```

---

### `clean-slop report [directory]`

Generate a report from a fresh scan and write it to a file.

```bash
# Generate an HTML report
clean-slop report --reporter html --output ./reports/clean-slop.html

# Generate a Markdown report for GitHub PR comments
clean-slop report --reporter markdown --output ./clean-slop.md
```

---

### `clean-slop doctor`

Diagnose the current environment. Reports Node.js version, configuration status, git repository presence, and loaded rules.

```bash
clean-slop doctor
```

---

### `clean-slop init`

Generate a `clean-slop.config.js` in the current directory with all options documented.

```bash
clean-slop init
clean-slop init --force   # Overwrite existing config
```

---

## Configuration

clean-slop uses [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig) for configuration discovery. Configuration is loaded from the first match of:

- `clean-slop.config.js`
- `clean-slop.config.ts`
- `clean-slop.config.mjs`
- `clean-slop.config.cjs`
- `.clean-slop.js`
- `.clean-slop.json`
- `.clean-slop.yaml`
- `package.json` (`"clean-slop"` key)

### Full Configuration Reference

```javascript
/** @type {import('clean-slop').UserConfig} */
export default {
  // Glob patterns of files to scan
  include: [
    '**/*.js',
    '**/*.jsx',
    '**/*.ts',
    '**/*.tsx',
    '**/*.mjs',
    '**/*.cjs',
  ],

  // Glob patterns to exclude
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

  // Per-rule severity overrides
  // Value: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'off'
  rules: {
    // Disable a rule entirely
    'ai-slop/empty-catch': 'off',

    // Escalate a rule to critical
    'security/hardcoded-secrets': 'critical',

    // Downgrade a rule severity
    'production-readiness/no-console-log': 'info',
  },

  // Minimum overall score before CI exits with code 1
  failThreshold: 70,

  // Maximum issues per severity (scan fails if exceeded)
  maxIssues: {
    critical: 0,    // Zero critical issues allowed
    high: 5,
  },

  // Reporter: 'text' | 'json' | 'html' | 'markdown' | 'sarif'
  reporter: 'text',

  // Output file path (null = stdout)
  output: null,

  // Verbose output (show snippets, fixes, docs links)
  verbose: false,

  // Additional ignore patterns (on top of .gitignore)
  ignorePatterns: ['src/legacy/**'],

  // Plugins to load
  plugins: [],
};
```

---

## Rule Reference

### AI Slop (`ai-slop`)

Rules that detect patterns characteristic of unreviewed AI-generated code.

| Rule ID | Severity | Description |
|---------|----------|-------------|
| `ai-slop/empty-catch` | high | Catch blocks that silently swallow errors |
| `ai-slop/todo-implementation` | high | TODO/FIXME comments and placeholder throw statements |
| `ai-slop/giant-function` | medium | Functions exceeding 80 lines |
| `ai-slop/excessive-nesting` | medium | Control flow nesting deeper than 4 levels |
| `ai-slop/fake-validation` | high | Validation functions that unconditionally return true |
| `ai-slop/high-complexity` | medium | Cyclomatic complexity exceeding 10 |
| `ai-slop/dead-code` | medium | Unreachable code after return/throw/break/continue |

---

### Security (`security`)

Rules that detect common vulnerability patterns.

| Rule ID | Severity | Description |
|---------|----------|-------------|
| `security/unsafe-eval` | critical | Use of eval() and new Function() |
| `security/hardcoded-secrets` | critical | API keys, passwords, tokens in source |
| `security/sql-injection` | critical | SQL built with string concatenation or template literals |
| `security/command-injection` | critical | child_process calls with dynamic arguments |
| `security/path-traversal` | critical | File system operations with dynamic paths |
| `security/prototype-pollution` | high | Dynamic property assignment and unsafe merge |
| `security/weak-crypto` | high | MD5, SHA1, ECB mode, Math.random() for secrets |
| `security/dangerous-cors` | high | Wildcard CORS, insecure cookie configuration |

---

### Reliability (`reliability`)

Rules that detect code likely to fail under load or in production conditions.

| Rule ID | Severity | Description |
|---------|----------|-------------|
| `reliability/unhandled-promise` | high | Fire-and-forget async calls with no error handling |
| `reliability/missing-await` | high | Async functions returning un-awaited Promises |
| `reliability/infinite-loop` | high | while(true) and for(;;) with no exit condition |

---

### Maintainability (`maintainability`)

Rules that identify structural problems affecting long-term code health.

| Rule ID | Severity | Description |
|---------|----------|-------------|
| `maintainability/giant-file` | medium | Source files exceeding 400 lines |
| `maintainability/circular-imports` | medium | Import patterns that commonly cause circular dependencies |

---

### Production Readiness (`production-readiness`)

Rules that detect development artifacts left in production code.

| Rule ID | Severity | Description |
|---------|----------|-------------|
| `production-readiness/no-console-log` | low | console.log and debug console methods |
| `production-readiness/no-localhost-urls` | medium | Localhost URLs, debug flags, mock implementations |

---

## Output Formats

### Text (default)

Color-coded terminal output with file grouping, severity labels, and optional verbose mode.

### JSON

Machine-readable full scan result. Includes every issue, score breakdown, file list, config, and metadata.

```bash
clean-slop scan --reporter json --output scan.json
```

### HTML

Self-contained single-file interactive report with filtering by severity. Suitable for CI artifacts and sharing with non-technical stakeholders.

```bash
clean-slop report --reporter html --output ./reports/scan.html
```

### Markdown

GitHub-flavored Markdown report suitable for posting as a PR comment or including in CI artifact summaries.

```bash
clean-slop report --reporter markdown --output ./clean-slop.md
```

### SARIF 2.1.0

Static Analysis Results Interchange Format. Compatible with GitHub Code Scanning, Azure DevOps, and VS Code SARIF Viewer.

```bash
clean-slop scan --reporter sarif --output results.sarif
```

---

## JavaScript / TypeScript API

clean-slop exposes a full programmatic API for integration with build tools, scripts, and other tooling.

```typescript
import { scanDirectory, loadConfig, generateReport } from 'clean-slop';

// Simple usage
const result = await scanDirectory('./src');
console.log(`Score: ${result.score.overall}/100`);
console.log(`Issues: ${result.issues.length}`);

// With configuration
const config = await loadConfig(process.cwd());
const result = await scanDirectory('./src', {
  categories: { security: true },
  failThreshold: 80,
});

// Generate a report
const html = generateReport(result, 'html');
```

### API Reference

#### `scanDirectory(directory, config?)`

Scan a directory and return a `ScanResult`.

```typescript
async function scanDirectory(
  directory: string,
  config?: UserConfig
): Promise<ScanResult>
```

#### `loadConfig(cwd, configPath?)`

Load and resolve configuration from the filesystem.

```typescript
async function loadConfig(
  cwd: string,
  configPath?: string
): Promise<ResolvedConfig>
```

#### `generateReport(result, reporter)`

Generate a report string from a scan result.

```typescript
function generateReport(
  result: ScanResult,
  reporter: 'text' | 'json' | 'html' | 'markdown' | 'sarif'
): string
```

---

## CI/CD Integration

### GitHub Actions

Add clean-slop as a required check in your CI pipeline:

```yaml
# .github/workflows/quality.yml
name: Code Quality

on: [push, pull_request]

jobs:
  clean-slop:
    name: Production Readiness Check
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci

      - name: Scan with clean-slop
        run: |
          npx clean-slop scan src \
            --reporter sarif \
            --output clean-slop-results.sarif \
            --fail-threshold 70 \
            --max-critical 0

      - name: Upload to GitHub Code Scanning
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: clean-slop-results.sarif
```

### npm scripts

```json
{
  "scripts": {
    "quality": "clean-slop scan src",
    "quality:ci": "clean-slop check src --fail-threshold 70",
    "quality:report": "clean-slop report --reporter html --output reports/quality.html"
  }
}
```

### Pre-commit hook

Using [husky](https://typicode.github.io/husky/):

```bash
npx husky add .husky/pre-commit "npx clean-slop check src --fail-threshold 60"
```

---

## Plugin Development

clean-slop supports custom plugins that add new rules.

### Creating a Plugin

```typescript
import type { Plugin, Rule, RuleContext } from 'clean-slop';

const myRule: Rule = {
  meta: {
    id: 'my-plugin/no-deprecated-api',
    name: 'No Deprecated API',
    category: 'maintainability',
    severity: 'medium',
    confidence: 'high',
    description: 'Detects usage of deprecated internal APIs.',
    rationale: 'Deprecated APIs will be removed in the next major release.',
    docsUrl: 'https://myteam.dev/docs/rules/no-deprecated-api',
    fixable: false,
  },

  create(context: RuleContext) {
    // Use the traverse utility or work with context.ast directly
    const ast = context.ast;

    // Report an issue
    context.report({
      message: 'Usage of deprecated API detected.',
      explanation: 'The legacyClient API will be removed in v3.0.',
      impact: 'This call will throw at runtime after the upgrade.',
      location: {
        file: context.filePath,
        line: 10,
        column: 0,
      },
      fix: {
        description: 'Replace legacyClient with modernClient.',
        code: "import { modernClient } from '@myorg/client';",
      },
    });
  },
};

const plugin: Plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  rules: [myRule],
};

export default plugin;
```

### Registering a Plugin

```javascript
// clean-slop.config.js
export default {
  plugins: ['./my-plugin.js', 'clean-slop-plugin-nestjs'],
};
```

---

## Architecture Overview

```
clean-slop/
├── src/
│   ├── cli/              # Commander-based CLI and command implementations
│   │   ├── bin.ts        # Entry point (#!/usr/bin/env node)
│   │   ├── index.ts      # Command registration
│   │   └── commands/     # scan, check, watch, report, doctor, init
│   ├── config/           # cosmiconfig loader and config resolution
│   ├── parsers/          # @typescript-eslint/typescript-estree AST parser
│   ├── rules/            # Rule engine and all built-in rules
│   │   ├── engine.ts     # RuleEngine class
│   │   ├── index.ts      # BUILT_IN_RULES registry
│   │   ├── ai-slop/      # AI slop detection rules
│   │   ├── security/     # Security rules
│   │   ├── reliability/  # Reliability rules
│   │   ├── maintainability/  # Maintainability rules
│   │   └── production-readiness/  # Production readiness rules
│   ├── scanners/         # File discovery and orchestration
│   ├── reporters/        # text, json, html, markdown, sarif reporters
│   ├── utils/            # AST traversal, constants, shared utilities
│   ├── types.ts          # All shared TypeScript interfaces
│   ├── version.ts        # Package version constant
│   └── index.ts          # Public API exports
├── tests/
│   ├── unit/             # Per-rule unit tests
│   ├── integration/      # Full scan pipeline tests
│   └── fixtures/         # Deliberately bad code for testing
└── .github/workflows/    # CI and release automation
```

**Data flow:**

1. CLI parses arguments → loads config
2. Scanner discovers files matching include/exclude globs
3. Parser converts each file to an AST using `@typescript-eslint/typescript-estree`
4. Rule engine iterates rules, calls `rule.create(context)` for each file
5. Rules call `context.report()` to record issues
6. Scanner computes per-category scores and overall score
7. Reporter generates output in the requested format
8. CLI exits with appropriate code based on score and maxIssues thresholds

---

## Security Philosophy

clean-slop treats security as a first-class concern. The security rule category is always enabled by default and cannot be silently bypassed.

Key principles:

**Detect at the pattern level.** Most static analysis requires full data-flow tracking, which is expensive and complex. clean-slop detects high-signal structural patterns that reliably indicate vulnerability classes even without full data-flow.

**Report false positives, not false negatives.** When a pattern is ambiguous, clean-slop reports it with an appropriate confidence level rather than silently ignoring it. A false positive in a security tool is a minor annoyance. A false negative is a breach.

**Explain why it matters.** Every security issue includes an `impact` field that explains what an attacker can do if the issue is exploited. Security issues are not academic.

**Never disable critical rules in config.** The `failThreshold` and `maxIssues` configuration allows teams to tune the gate, but rules themselves can only be downgraded or turned off explicitly by ID in configuration. There is no way to globally disable security checks.

---

## AI Slop Philosophy

AI code generation tools are productivity multipliers. They are also pattern completion engines that produce syntactically correct, test-passable code without any understanding of production requirements.

The AI slop category detects specific patterns that AI generators produce systematically:

- **Empty catch blocks** — the generator handles the error path syntactically but not semantically. The exception vanishes.
- **Fake validation** — the generator names the function `validateEmail` to make the code look complete, but the body is `return true`.
- **TODO/placeholder throws** — the generator creates the skeleton of a feature and marks everything unimplemented. The feature is never implemented.
- **Giant functions** — the generator places all logic in a single function without decomposing it into maintainable units.
- **High complexity** — the generator combines multiple responsibilities into one function, creating code with too many paths to test.

clean-slop does not penalize AI-assisted development. It penalizes AI-generated code that was never reviewed.

---

## Contributing

Contributions are welcome. The project is structured so that adding a new rule requires only creating a single file in the appropriate category directory and adding the import to `src/rules/index.ts`.

### Development Setup

```bash
git clone https://github.com/clean-slop/clean-slop
cd clean-slop
npm install
npm run build
npm test
```

### Adding a Rule

1. Create `src/rules/<category>/<rule-name>.ts`
2. Implement the `Rule` interface (see existing rules for examples)
3. Add the import and export to `src/rules/index.ts`
4. Add unit tests to `tests/unit/`
5. Add a fixture case to `tests/fixtures/` if needed

### Rule Implementation Template

```typescript
import type { Rule } from '../../types.js';
import { traverse, getLocation } from '../../utils/ast.js';
import type { ASTNode } from '../../utils/ast.js';

const rule: Rule = {
  meta: {
    id: 'category/rule-name',
    name: 'Human Readable Rule Name',
    category: 'security', // ai-slop | security | reliability | maintainability | production-readiness
    severity: 'high',
    confidence: 'high',
    description: 'One sentence description.',
    rationale: 'Why this matters and what it indicates.',
    docsUrl: 'https://clean-slop.dev/docs/rules/category/rule-name',
    fixable: false,
  },

  create(context) {
    traverse(context.ast, {
      CallExpression(node: ASTNode) {
        // Detection logic here
        context.report({
          message: 'Short description of what was found.',
          explanation: 'Full explanation of the issue.',
          impact: 'What happens in production if this is not fixed.',
          location: getLocation(node, context.filePath),
          fix: {
            description: 'How to fix this.',
            code: '// Example fix code',
          },
        });
      },
    });
  },
};

export default rule;
```

### Testing Guide

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run a specific test file
npx vitest run tests/unit/security-rules.test.ts
```

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new rule security/jwt-none-algorithm
fix: correct false positive in ai-slop/fake-validation
docs: update CLI reference for watch command
test: add coverage for path-traversal rule
refactor: extract AST traversal utilities
```

---

## Release Guide

Releases are automated via GitHub Actions on tag push.

```bash
# Bump version
npm version patch   # 1.0.0 → 1.0.1
npm version minor   # 1.0.0 → 1.1.0
npm version major   # 1.0.0 → 2.0.0

# Push with tag
git push origin main --follow-tags
```

The release workflow will:
1. Run tests
2. Build the package
3. Publish to npm with provenance
4. Create a GitHub Release with auto-generated release notes

---

## Troubleshooting

**Parse errors on valid files**

clean-slop uses `@typescript-eslint/typescript-estree` for parsing. Experimental syntax (decorators, certain JSX patterns) may require a `tsconfig.json`. Run `clean-slop doctor` to verify the environment.

**False positives in generated code**

Add generated files to the `exclude` array in configuration:

```javascript
exclude: ['**/__generated__/**', '**/*.generated.ts', '**/graphql-types.ts'],
```

**Score is lower than expected**

Run with `--verbose` to see the full explanation for each issue. Check which category is pulling the score down and use `--no-<category>` flags or per-rule `'off'` configuration to tune the results.

**CI exits with code 1**

The process exits with code 1 when the score is below `failThreshold` or when `maxIssues` limits are exceeded. Run `clean-slop scan --verbose` locally to see exactly which issues are causing the failure.

---

## FAQ

**Does clean-slop replace ESLint?**

No. ESLint and clean-slop serve different purposes. ESLint is a style and correctness linter. clean-slop analyzes production readiness patterns, security vulnerabilities, and AI-generated code quality. They are complementary.

**Can I use clean-slop with JavaScript (not TypeScript)?**

Yes. clean-slop supports plain `.js`, `.jsx`, `.mjs`, and `.cjs` files.

**Does clean-slop modify my code?**

No. clean-slop is a read-only analysis tool. It reports issues and suggests fixes but never modifies files. The `fix` field in each issue contains suggested remediation, but applying it is always a manual action.

**What is the performance profile?**

On a typical 50,000 line TypeScript project, clean-slop completes a full scan in 2–5 seconds on modern hardware.

**How is the score calculated?**

Each category starts at 100. Issues deduct points based on severity: critical (-20), high (-10), medium (-4), low (-1). Each category score is floored at 0. The overall score is the average of all 5 category scores.

**Can teams add custom rules?**

Yes, via the plugin system. See the Plugin Development section above.

---

## Roadmap

- [ ] Additional security rules: JWT algorithm validation, ReDoS detection, insecure deserialization
- [ ] React-specific rules: missing key props, unsafe innerHTML, useEffect cleanup
- [ ] Next.js rules: server-side data exposure, missing authentication on API routes
- [ ] NestJS rules: missing guards, exposed internal routes
- [ ] Dependency health analysis (known vulnerabilities via OSV)
- [ ] Duplicate code detection (AST-based similarity)
- [ ] VS Code extension
- [ ] GitHub App for automated PR comments

---

## License

MIT — see [LICENSE](./LICENSE)

---

## Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/) code of conduct. Be respectful, constructive, and professional in all interactions.

---

*clean-slop is built for teams that ship production software and need confidence that what they merge is actually ready for production.*
