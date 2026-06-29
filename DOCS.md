# clean-slop Documentation

Full technical reference for clean-slop v1.0.0.

---

## Table of Contents

- [Installation](#installation)
- [CLI Reference](#cli-reference)
- [Configuration](#configuration)
- [Rule Reference](#rule-reference)
- [Output Formats](#output-formats)
- [JavaScript API](#javascript-api)
- [CI/CD Integration](#cicd-integration)
- [Plugin Development](#plugin-development)
- [Architecture](#architecture)
- [Security Philosophy](#security-philosophy)
- [AI Slop Philosophy](#ai-slop-philosophy)
- [Contributing](#contributing)
- [Testing](#testing)
- [Release Process](#release-process)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## Installation

```bash
# As a dev dependency (recommended)
npm install -D clean-slop

# Global installation
npm install -g clean-slop

# Without installing
npx clean-slop scan
```

**Requirements:** Node.js >= 18.0.0

---

## CLI Reference

### `clean-slop scan [directory]`

Scan a directory for issues. This is the default command when no subcommand is given.

```
Options:
  -c, --config <path>           Path to a configuration file
  --reporter <name>             Reporter: text | json | html | markdown | sarif   [default: text]
  -o, --output <file>           Write the report to a file instead of stdout
  --fail-threshold <score>      Minimum score before exiting with code 1           [default: 70]
  --max-critical <n>            Maximum allowed critical issues                    [default: 0]
  --max-high <n>                Maximum allowed high severity issues
  --no-ai-slop                  Disable the AI slop rule category
  --no-security                 Disable the security rule category
  --no-reliability              Disable the reliability rule category
  --no-maintainability          Disable the maintainability rule category
  --no-production-readiness     Disable the production readiness rule category
  --verbose                     Print full issue details with snippets and fix suggestions
  --quiet                       Print only the score summary
  --ci                          CI mode: no color, machine-readable output
  -v, --version                 Print the version
  -h, --help                    Display help
```

**Exit codes:**

- `0` — scan completed, score is above threshold, issue counts within limits
- `1` — score below threshold, or issue count limit exceeded, or parse failure

**Examples:**

```bash
# Scan src/ with full verbose output
clean-slop scan src --verbose

# Fail if any critical issues exist
clean-slop scan --max-critical 0

# Output SARIF for GitHub Code Scanning
clean-slop scan --reporter sarif --output results.sarif

# Scan without security rules
clean-slop scan --no-security

# Quiet CI check
clean-slop scan --ci --quiet --fail-threshold 80
```

---

### `clean-slop check [directory]`

Minimal pass/fail check. Prints `PASS` or `FAIL` with the score and exits accordingly. Designed for CI gates where you want a fast binary result without a full report.

```
Options:
  -c, --config <path>          Path to a configuration file
  --fail-threshold <score>     Minimum passing score   [default: 70]
  --max-critical <n>           Maximum critical issues  [default: 0]
```

**Example:**

```bash
clean-slop check src --fail-threshold 80 --max-critical 0
# PASS  Score: 91/100  Grade: A  (threshold: 80)
# or
# FAIL  Score: 64/100  Grade: D
```

---

### `clean-slop watch [directory]`

Watch source files for changes and re-scan automatically. Useful during active development for continuous feedback without running CI.

```
Options:
  -c, --config <path>    Path to a configuration file
  --verbose              Print full issue details on each scan
```

Press `Ctrl+C` to stop watching.

---

### `clean-slop report [directory]`

Run a scan and write the output to a file. Defaults to HTML reporter if no reporter is specified.

```
Options:
  -c, --config <path>       Path to a configuration file
  --reporter <name>         Reporter: text | json | html | markdown | sarif   [default: html]
  -o, --output <file>       Output file path
```

**Examples:**

```bash
# HTML report for sharing
clean-slop report --reporter html --output ./reports/quality.html

# Markdown report for a PR comment
clean-slop report --reporter markdown --output ./quality.md

# SARIF for GitHub Code Scanning upload
clean-slop report --reporter sarif --output ./results.sarif
```

---

### `clean-slop doctor`

Diagnose the current environment, configuration, and installation. Reports:

- Node.js version and compatibility
- npm availability
- Configuration file resolution
- Enabled categories and rule overrides
- Package.json and tsconfig.json presence
- Git repository status
- Total rules loaded per category

```bash
clean-slop doctor
```

---

### `clean-slop init`

Generate a `clean-slop.config.js` in the current directory with all options documented inline.

```bash
clean-slop init

# Overwrite an existing config
clean-slop init --force
```

---

## Configuration

clean-slop uses [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig) for configuration discovery. It searches from the current working directory upward for the first match of:

- `clean-slop.config.js`
- `clean-slop.config.ts`
- `clean-slop.config.mjs`
- `clean-slop.config.cjs`
- `.clean-slop.js`
- `.clean-slop.json`
- `.clean-slop.yaml`
- `.clean-slop.yml`
- `package.json` (`"clean-slop"` key)

### Full configuration reference

```javascript
/** @type {import('clean-slop').UserConfig} */
export default {

  // Glob patterns of files to include in scanning.
  // Default: all JS and TS extensions.
  include: [
    '**/*.js',
    '**/*.jsx',
    '**/*.ts',
    '**/*.tsx',
    '**/*.mjs',
    '**/*.cjs',
  ],

  // Glob patterns to exclude.
  // Default: node_modules, dist, build, .next, coverage, minified files, generated files.
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

  // Enable or disable entire rule categories.
  // All categories are enabled by default.
  categories: {
    'ai-slop': true,
    'security': true,
    'reliability': true,
    'maintainability': true,
    'production-readiness': true,
  },

  // Per-rule severity overrides.
  // Values: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'off'
  rules: {
    // Disable a specific rule entirely
    'ai-slop/empty-catch': 'off',

    // Escalate a rule to a higher severity
    'security/hardcoded-secrets': 'critical',

    // Downgrade a rule
    'production-readiness/no-console-log': 'info',
  },

  // Minimum overall score (0–100) before the process exits with code 1.
  failThreshold: 70,

  // Maximum number of issues per severity level.
  // If any limit is exceeded, the scan fails regardless of the overall score.
  maxIssues: {
    critical: 0,   // Zero critical issues tolerated
    high: 5,
  },

  // Reporter to use when writing to stdout or a file.
  // Values: 'text' | 'json' | 'html' | 'markdown' | 'sarif'
  reporter: 'text',

  // Output file path. null = write to stdout.
  output: null,

  // Print full explanations, code snippets, and fix suggestions.
  verbose: false,

  // Additional file patterns to ignore (on top of .gitignore).
  ignorePatterns: [
    'src/legacy/**',
  ],

  // Paths to plugin modules.
  plugins: [],

};
```

### Configuration via package.json

```json
{
  "clean-slop": {
    "failThreshold": 80,
    "categories": {
      "ai-slop": true,
      "security": true
    }
  }
}
```

---

## Rule Reference

### Severity levels

| Level | Meaning |
|-------|---------|
| `critical` | Immediate security or data integrity risk. Must be resolved before merge. |
| `high` | Significant reliability or security concern. Should be resolved before merge. |
| `medium` | Code quality or maintainability problem. Address in current sprint. |
| `low` | Minor cleanup item. Address when convenient. |
| `info` | Informational. No action required. |

### Confidence levels

| Level | Meaning |
|-------|---------|
| `certain` | The pattern unambiguously indicates the issue. No false positives expected. |
| `high` | The pattern very strongly indicates the issue. Rare false positives. |
| `medium` | The pattern is a strong signal but context-dependent. Review before acting. |
| `low` | Heuristic signal. Requires manual judgment. |

---

### AI Slop (`ai-slop`)

Rules that detect patterns characteristic of AI-generated code that was never properly reviewed.

---

#### `ai-slop/empty-catch`

**Severity:** high — **Confidence:** certain

Detects catch blocks that contain no statements. These silently swallow exceptions, making failures invisible in production.

```javascript
// Flagged
try {
  connectToDatabase();
} catch (err) {
  // nothing
}

// Acceptable
try {
  connectToDatabase();
} catch (err) {
  logger.error('Database connection failed:', err);
  throw err;
}
```

---

#### `ai-slop/todo-implementation`

**Severity:** high — **Confidence:** high

Detects `TODO`, `FIXME`, `HACK`, `XXX`, and `PLACEHOLDER` comments, and functions whose body is `throw new Error('Not implemented')` or similar.

```javascript
// Flagged
// TODO: implement retry logic
function sendWithRetry(payload) {
  throw new Error('Not implemented');
}
```

---

#### `ai-slop/giant-function`

**Severity:** medium — **Confidence:** certain

Flags functions exceeding 80 lines. Functions exceeding 200 lines are flagged at high severity. AI generators tend to dump entire workflows into single functions without decomposing them.

---

#### `ai-slop/excessive-nesting`

**Severity:** medium — **Confidence:** certain

Flags functions with control-flow nesting deeper than 4 levels (if, for, while, try, switch). Deep nesting is a reliable indicator of logic that was generated without refactoring.

---

#### `ai-slop/fake-validation`

**Severity:** high — **Confidence:** medium

Detects functions whose name starts with `validate`, `isValid`, `check`, `verify`, `sanitize`, or `assert` but whose body unconditionally returns `true`.

```javascript
// Flagged — name implies validation, body does nothing
function validateEmail(email) {
  return true;
}
```

---

#### `ai-slop/high-complexity`

**Severity:** medium — **Confidence:** certain

Flags functions with cyclomatic complexity exceeding 10. Complexity is calculated by counting independent execution paths: if, else if, ternary, &&, ||, ??, for, while, switch cases, catch.

---

#### `ai-slop/dead-code`

**Severity:** medium — **Confidence:** certain

Detects statements that follow a `return`, `throw`, `break`, or `continue` in the same block. Dead code after early exits indicates control-flow errors and is a common AI generation artifact.

```javascript
// Flagged
function process(items) {
  return items.filter(Boolean);
  console.log('done'); // never reached
}
```

---

### Security (`security`)

---

#### `security/unsafe-eval`

**Severity:** critical — **Confidence:** high

Detects use of `eval()`, `new Function()`, and `execScript()`. These evaluate strings as JavaScript at runtime and are code injection vectors when any part of the string comes from external data.

```javascript
// Flagged
eval(userInput);
const fn = new Function('return ' + userExpression);
```

---

#### `security/hardcoded-secrets`

**Severity:** critical — **Confidence:** high

Detects API keys, passwords, database credentials, JWT secrets, private keys, and tokens hardcoded directly in source files.

Patterns detected include AWS access keys (`AKIA...`), GitHub personal access tokens (`ghp_...`), Stripe keys, PEM private keys, database connection strings with embedded credentials, and general `secret =` / `password =` assignments with non-placeholder values.

```javascript
// Flagged
const API_KEY = 'AKIAIOSFODNN7EXAMPLE123';
const DB_PASSWORD = 'p@ssw0rd99';

// Acceptable
const apiKey = process.env.API_KEY;
```

---

#### `security/sql-injection`

**Severity:** critical — **Confidence:** high

Detects SQL queries constructed using template literals with expressions, or string concatenation, passed to known database query functions.

```javascript
// Flagged
db.query(`SELECT * FROM users WHERE id = ${userId}`);
db.query("SELECT * FROM users WHERE name = " + userName);

// Acceptable
db.query('SELECT * FROM users WHERE id = ?', [userId]);
```

---

#### `security/command-injection`

**Severity:** critical — **Confidence:** high

Detects calls to `exec`, `execSync`, `spawn`, `spawnSync`, `execFile`, and related `child_process` functions where the first argument is dynamically constructed rather than a static string.

```javascript
// Flagged
exec(`ls ${userPath}`);

// Acceptable
execFile('ls', [sanitizedPath], callback);
```

---

#### `security/path-traversal`

**Severity:** critical — **Confidence:** medium

Detects file system operations (`readFile`, `writeFile`, `createReadStream`, `unlink`, etc.) where the path argument is not a string literal. If the path derives from user input, an attacker can use `../` sequences to escape the intended directory.

```javascript
// Flagged
fs.readFile(req.params.filename);

// Acceptable — after validation
const base = path.resolve('./uploads');
const safe = path.resolve(base, filename);
if (!safe.startsWith(base + path.sep)) throw new Error('Invalid path');
fs.readFile(safe);
```

---

#### `security/prototype-pollution`

**Severity:** high — **Confidence:** medium

Detects dynamic bracket assignment to object properties (`obj[key] = value`) where the key is not validated, and calls to `Object.assign`, `_.merge`, and similar deep-merge functions with non-literal source objects.

```javascript
// Flagged
obj[userKey] = value; // key could be __proto__
Object.assign(target, req.body); // untrusted source

// Acceptable
if (ALLOWED_KEYS.has(key)) obj[key] = value;
```

---

#### `security/weak-crypto`

**Severity:** high — **Confidence:** high

Detects:

- `Math.random()` used in any security context
- `crypto.createHash('md5')` or `crypto.createHash('sha1')`
- `crypto.createCipheriv` with ECB or CBC cipher modes

```javascript
// Flagged
const token = Math.random().toString(36);
crypto.createHash('md5').update(data).digest('hex');

// Acceptable
crypto.randomBytes(32).toString('hex');
crypto.createHash('sha256').update(data).digest('hex');
```

---

#### `security/dangerous-cors`

**Severity:** high — **Confidence:** high

Detects:

- `cors({ origin: '*' })` or `cors({ origin: true })` — allows any origin
- Cookie options with `httpOnly: false` — exposes cookies to XSS
- Cookie options with `secure: false` — allows cookies over HTTP
- `sameSite: 'none'` without `secure: true`

```javascript
// Flagged
app.use(cors({ origin: '*' }));
res.cookie('session', token, { httpOnly: false });

// Acceptable
app.use(cors({ origin: process.env.ALLOWED_ORIGIN }));
res.cookie('session', token, { httpOnly: true, secure: true, sameSite: 'strict' });
```

---

### Reliability (`reliability`)

---

#### `reliability/unhandled-promise`

**Severity:** high — **Confidence:** medium

Detects calls to known async APIs (`fetch`, `readFile`, `writeFile`, `save`, `find`, `send`, etc.) that appear as standalone expression statements — the return value (a Promise) is discarded.

```javascript
// Flagged
fetch('/api/notify'); // result ignored

// Acceptable
await fetch('/api/notify');
fetch('/api/notify').catch(err => logger.error(err));
```

---

#### `reliability/missing-await`

**Severity:** high — **Confidence:** medium

Detects async functions that return a likely-async call without awaiting it. This loses the error context when the function is wrapped in a try/catch — the catch will not trigger for the returned Promise.

```javascript
// Flagged — catch won't catch errors from db.query
async function getUser(id) {
  try {
    return db.query('SELECT * FROM users WHERE id = ?', [id]);
  } catch (err) {
    logger.error(err); // never runs
  }
}

// Acceptable
async function getUser(id) {
  return await db.query('SELECT * FROM users WHERE id = ?', [id]);
}
```

---

#### `reliability/infinite-loop`

**Severity:** high — **Confidence:** medium

Detects `while(true)` and `for(;;)` loops that contain no `break`, `return`, or `throw` statement at any nesting level inside the loop body.

```javascript
// Flagged
while (true) {
  process();
}

// Acceptable
while (true) {
  const result = process();
  if (result.done) break;
}
```

---

### Maintainability (`maintainability`)

---

#### `maintainability/giant-file`

**Severity:** medium — **Confidence:** certain

Flags source files exceeding 400 lines. Files exceeding 1000 lines are flagged at high severity. Large files concentrate unrelated logic, create merge conflicts, and indicate poor module boundary design.

---

#### `maintainability/circular-imports`

**Severity:** medium — **Confidence:** low

Detects import patterns that commonly cause circular dependency cycles. Specifically flags non-index files that import from the barrel index of their own directory, which is the most common source of accidental circular dependencies.

```javascript
// Flagged (in src/auth/token.ts)
import { something } from './index'; // may re-export token.ts

// Acceptable — import directly
import { something } from './utils';
```

Full circular dependency detection requires a multi-file graph analysis pass. This rule uses single-file heuristics with low confidence. For complete detection, use [madge](https://github.com/pahen/madge).

---

### Production Readiness (`production-readiness`)

---

#### `production-readiness/no-console-log`

**Severity:** low — **Confidence:** certain

Detects `console.log()`, `console.debug()`, `console.dir()`, `console.trace()`, and `console.table()`. These are debug statements that leak internal state, pollute logs, and may expose sensitive data.

`console.error()`, `console.warn()`, and `console.info()` are not flagged.

```javascript
// Flagged
console.log('Processing request:', req.body);
console.debug('Token:', token);

// Acceptable
console.error('Database error:', err);
```

---

#### `production-readiness/no-localhost-urls`

**Severity:** medium — **Confidence:** high

Detects:

- Hardcoded `http://localhost`, `http://127.0.0.1`, or `http://0.0.0.0` URLs
- Variables named `debug`, `DEBUG`, `debugMode`, `devMode`, or `testMode` initialized to `true`
- Functions whose names begin with `mock`, `fake`, `stub`, or `dummy`
- Test credentials with obvious values (`password123`, `test`, `admin`)

---

## Output Formats

### Text

Default. Color-coded terminal output grouped by file, showing severity, rule ID, location, and (with `--verbose`) full explanation, code snippet, fix suggestion, and documentation link.

### JSON

Machine-readable full scan result. The JSON structure mirrors the `ScanResult` TypeScript type exactly. Suitable for custom tooling and dashboards.

```bash
clean-slop scan --reporter json --output scan.json
```

**Top-level fields:**

| Field | Type | Description |
|-------|------|-------------|
| `root` | string | Absolute path of scanned directory |
| `timestamp` | string | ISO 8601 scan timestamp |
| `version` | string | clean-slop version |
| `files` | FileResult[] | Per-file results including parse errors |
| `issues` | Issue[] | All issues sorted by severity |
| `score` | ScanScore | Overall and per-category scores |
| `durationMs` | number | Scan duration in milliseconds |
| `config` | ResolvedConfig | Resolved configuration used |

### HTML

Self-contained single-file report. No external dependencies. Includes a filter bar to show issues by severity. Suitable for CI artifacts, email attachments, and sharing with non-technical stakeholders.

### Markdown

GitHub-flavored Markdown. Critical and high issues are shown expanded. Medium and low issues are collapsed inside `<details>` blocks. Suitable for automated PR comments via CI.

### SARIF 2.1.0

Static Analysis Results Interchange Format. Compatible with:

- GitHub Code Scanning (upload via `github/codeql-action/upload-sarif`)
- Azure DevOps
- VS Code SARIF Viewer extension

Each result includes `primaryLocationLineHash` for deduplication across runs, and `security-severity` scores compatible with GitHub's severity mapping.

---

## JavaScript API

```typescript
import { scanDirectory, loadConfig, generateReport } from 'clean-slop';
```

### `scanDirectory(directory, config?)`

```typescript
async function scanDirectory(
  directory: string,
  config?: UserConfig
): Promise<ScanResult>
```

Scan a directory and return the full result. Accepts an optional partial `UserConfig` that is merged with defaults.

```typescript
const result = await scanDirectory('./src');
console.log(`Score: ${result.score.overall}/100`);
console.log(`Grade: ${result.score.grade}`);
console.log(`Issues: ${result.issues.length}`);
console.log(`Production ready: ${result.score.productionReady}`);
```

### `loadConfig(cwd, configPath?)`

```typescript
async function loadConfig(
  cwd: string,
  configPath?: string
): Promise<ResolvedConfig>
```

Load configuration from the filesystem using cosmiconfig. Pass an explicit path to bypass discovery.

### `generateReport(result, reporter)`

```typescript
function generateReport(
  result: ScanResult,
  reporter: 'text' | 'json' | 'html' | 'markdown' | 'sarif'
): string
```

Generate a report string from a scan result. Use `writeReport` to write it to disk.

### `writeReport(content, outputPath)`

```typescript
async function writeReport(content: string, outputPath: string): Promise<void>
```

Write a report string to disk, creating intermediate directories as needed.

### `RuleEngine`

```typescript
import { RuleEngine, BUILT_IN_RULES } from 'clean-slop';

const engine = new RuleEngine();
engine.registerAll(BUILT_IN_RULES);
```

The rule engine is exposed for advanced use cases such as running rules against a pre-parsed AST, building custom tooling on top of the engine, or unit-testing individual rules.

### `parseFile(filePath)` / `parseSource(filePath, source)`

```typescript
async function parseFile(filePath: string): Promise<ParsedFile>
function parseSource(filePath: string, source: string): ParsedFile
```

Parse a file or source string into an AST using `@typescript-eslint/typescript-estree`. The returned `ParsedFile` is what the rule engine operates on.

---

## TypeScript types

```typescript
interface ScanResult {
  root: string;
  timestamp: string;
  version: string;
  files: FileResult[];
  issues: Issue[];
  score: ScanScore;
  durationMs: number;
  config: ResolvedConfig;
}

interface Issue {
  ruleId: string;
  ruleName: string;
  category: RuleCategory;
  severity: Severity;
  confidence: Confidence;
  message: string;
  explanation: string;
  impact: string;
  location: Location;
  snippet?: string;
  fix?: IssueFix;
  docsUrl?: string;
}

interface ScanScore {
  overall: number;       // 0–100
  categories: CategoryScore[];
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  productionReady: boolean;
}

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
type Confidence = 'certain' | 'high' | 'medium' | 'low';
type RuleCategory =
  | 'ai-slop'
  | 'security'
  | 'reliability'
  | 'maintainability'
  | 'production-readiness';
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/quality.yml
name: Code Quality

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  clean-slop:
    name: Production Readiness
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

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
          category: clean-slop
```

After uploading SARIF, issues appear in the **Security** tab of your repository under **Code scanning alerts**, with full issue details, file locations, and severity badges.

### npm scripts

```json
{
  "scripts": {
    "quality": "clean-slop scan src",
    "quality:check": "clean-slop check src",
    "quality:report": "clean-slop report --reporter html --output reports/quality.html"
  }
}
```

### Pre-commit hook with Husky

```bash
npm install -D husky
npx husky init
echo "npx clean-slop check src --fail-threshold 60" > .husky/pre-commit
```

### GitLab CI

```yaml
clean-slop:
  stage: test
  image: node:20
  script:
    - npm ci
    - npx clean-slop check src --fail-threshold 70
  artifacts:
    when: always
    paths:
      - clean-slop-results.sarif
```

---

## Plugin Development

Plugins add new rules to clean-slop without modifying the core package.

### Creating a rule

```typescript
import type { Rule, RuleContext } from 'clean-slop';
import { traverse, getLocation } from 'clean-slop/utils/ast';
import type { ASTNode } from 'clean-slop/utils/ast';

const noLegacyApiRule: Rule = {
  meta: {
    id: 'my-plugin/no-legacy-api',
    name: 'No Legacy API',
    category: 'maintainability',
    severity: 'high',
    confidence: 'certain',
    description: 'Detects usage of the deprecated legacyClient API.',
    rationale: 'legacyClient is removed in v3. All usages must be migrated to modernClient.',
    docsUrl: 'https://your-docs/no-legacy-api',
    fixable: false,
  },

  create(context: RuleContext) {
    traverse(context.ast, {
      MemberExpression(node: ASTNode) {
        const obj = node.object as ASTNode | undefined;
        if (obj?.type === 'Identifier' && String(obj.name) === 'legacyClient') {
          context.report({
            message: 'legacyClient is deprecated and will be removed in v3.',
            explanation: 'All usages of legacyClient must be migrated to modernClient before upgrading.',
            impact: 'This call will throw at runtime after the v3 upgrade.',
            location: getLocation(node, context.filePath),
            fix: {
              description: 'Replace legacyClient with modernClient from @your-org/client.',
              code: "import { modernClient } from '@your-org/client';",
            },
          });
        }
      },
    });
  },
};

export default noLegacyApiRule;
```

### Creating a plugin

A plugin is a module that exports a `Plugin` object:

```typescript
import type { Plugin } from 'clean-slop';
import noLegacyApiRule from './rules/no-legacy-api.js';
import noDeprecatedHookRule from './rules/no-deprecated-hook.js';

const plugin: Plugin = {
  name: 'my-org-plugin',
  version: '1.0.0',
  rules: [noLegacyApiRule, noDeprecatedHookRule],
};

export default plugin;
```

### Registering a plugin

```javascript
// clean-slop.config.js
export default {
  plugins: [
    './my-org-plugin.js',            // local path
    'clean-slop-plugin-nestjs',      // npm package
    '@my-org/clean-slop-plugin',     // scoped package
  ],
};
```

### Rule context API

Inside `rule.create(context)`:

| Property | Type | Description |
|----------|------|-------------|
| `context.filePath` | string | Absolute path of the file being analyzed |
| `context.source` | string | Raw source text of the file |
| `context.ast` | unknown | Parsed AST (typescript-estree format) |
| `context.config` | ResolvedConfig | Full resolved configuration |
| `context.report(issue)` | function | Report an issue for this rule |

### AST utilities

```typescript
import { traverse, findAll, findFirst, getLocation, cyclomaticComplexity } from 'clean-slop/utils/ast';

// Traverse an AST, calling handlers by node type
traverse(ast, {
  CallExpression(node) { /* ... */ },
  Identifier(node) { /* ... */ },
  '*'(node) { /* called for every node */ },
});

// Collect all nodes of a type
const allCalls = findAll(ast, 'CallExpression');

// Find the first matching node
const firstIf = findFirst(ast, 'IfStatement');

// Get a safe location object from a node
const loc = getLocation(node, filePath);

// Calculate cyclomatic complexity of a function node
const complexity = cyclomaticComplexity(functionNode);
```

---

## Architecture

```
clean-slop/
├── src/
│   ├── cli/
│   │   ├── bin.ts              Entry point — bootstraps and parses argv
│   │   ├── index.ts            Command registration via commander
│   │   └── commands/
│   │       ├── scan.ts         scan command implementation
│   │       ├── check.ts        check command implementation
│   │       ├── watch.ts        watch command with fs.watch debouncing
│   │       ├── report.ts       report command implementation
│   │       ├── doctor.ts       environment diagnostics
│   │       └── init.ts         config file scaffolding
│   ├── config/
│   │   └── loader.ts           cosmiconfig discovery, defaults, resolveConfig()
│   ├── parsers/
│   │   └── source-parser.ts    Wraps @typescript-eslint/typescript-estree
│   ├── rules/
│   │   ├── engine.ts           RuleEngine class — registers, filters, and runs rules
│   │   ├── index.ts            BUILT_IN_RULES registry and exports
│   │   ├── ai-slop/            7 AI slop rules
│   │   ├── security/           8 security rules
│   │   ├── reliability/        3 reliability rules
│   │   ├── maintainability/    2 maintainability rules
│   │   └── production-readiness/  2 production readiness rules
│   ├── reporters/
│   │   ├── text-reporter.ts    ANSI color terminal output
│   │   ├── json-reporter.ts    Full structured JSON
│   │   ├── html-reporter.ts    Self-contained single-file HTML
│   │   ├── markdown-reporter.ts  GitHub-flavored Markdown
│   │   ├── sarif-reporter.ts   SARIF 2.1.0
│   │   └── index.ts            Reporter factory and writeReport()
│   ├── scanners/
│   │   └── scanner.ts          File discovery, parse orchestration, scoring
│   ├── utils/
│   │   ├── ast.ts              traverse(), findAll(), getLocation(), complexity
│   │   └── constants.ts        ANSI codes, severity ordering
│   ├── types.ts                All shared TypeScript interfaces
│   ├── version.ts              Package version constant
│   └── index.ts                Public API exports
├── tests/
│   ├── unit/                   Per-rule unit tests (60 tests)
│   ├── integration/            Full scan pipeline tests
│   └── fixtures/               Deliberately bad code for integration testing
└── .github/
    └── workflows/
        ├── ci.yml              Build, test, self-scan on push/PR
        └── release.yml         npm publish on tag push
```

### Data flow

```
CLI args
    │
    ▼
loadConfig()          ← cosmiconfig discovery + defaults + CLI overrides
    │
    ▼
discoverFiles()       ← fast-glob + .gitignore filtering
    │
    ▼
For each file:
    parseSource()     ← @typescript-eslint/typescript-estree → AST
    engine.runOnFile() ← iterate rules, call rule.create(context), collect reports
    │
    ▼
computeScore()        ← per-category deductions, overall average, grade
    │
    ▼
Reporter.generate()   ← format output
    │
    ▼
stdout or file        ← write + exit code
```

### Scoring algorithm

Each category starts at 100. Per-issue deductions:

| Severity | Deduction |
|----------|-----------|
| critical | 20 points |
| high | 10 points |
| medium | 4 points |
| low | 1 point |
| info | 0 points |

Category scores are floored at 0. The overall score is the unweighted average of all 5 category scores. Grade thresholds: A ≥ 90, B ≥ 75, C ≥ 60, D ≥ 40, F < 40.

---

## Security Philosophy

**Detect at the pattern level.** Full data-flow analysis is computationally expensive and requires a complete type graph. clean-slop detects high-signal structural patterns that reliably indicate vulnerability classes even without tracking values across call boundaries. The pattern `eval(x)` is dangerous regardless of where `x` comes from; the pattern `db.query(\`... ${x}\`)` is dangerous regardless of whether `x` has been sanitized elsewhere.

**Prefer false positives over false negatives.** A false positive in a security tool is a minor annoyance that requires a rule disable comment. A false negative is a breach. When a pattern is ambiguous, clean-slop reports it with an appropriate confidence level rather than silently skipping it.

**Explain the real risk.** Every security issue includes an `impact` field that describes what an attacker can actually do if the issue is exploited. Security issues should not be abstract; they should be motivating.

**No silent global disables.** There is no `--no-security` flag that removes all security rules at once from CI. Individual rules can be turned off by ID in configuration, which creates an explicit record of the decision.

---

## AI Slop Philosophy

AI code generation tools are legitimate productivity tools. They also produce code that has never been reviewed, never been reasoned about, and was never intended to be correct — only to be syntactically plausible given the surrounding context.

The patterns clean-slop detects in the AI slop category are not style preferences. They are structural indicators that the code was generated but never reviewed:

- **Empty catch blocks** — the generator satisfies the syntactic requirement for a catch clause without understanding that swallowing exceptions is worse than not catching them.
- **Fake validation** — the generator produces a function named `validateEmail` because that is what was asked for, with a body that returns `true` because completing the actual validation was not modeled.
- **Placeholder throws** — the generator produces `throw new Error('Not implemented')` to satisfy the type signature while deferring actual implementation. The deferred implementation never arrives.
- **Giant functions** — the generator places all logic in the most locally coherent location without reasoning about maintainability.
- **Dead code** — the generator inserts statements after early returns because it does not track control flow; it generates the next plausible token.

clean-slop does not penalize AI-assisted development. It penalizes AI-generated code that shipped without a human verifying that it was production-appropriate.

---

## Contributing

### Setup

```bash
git clone https://github.com/clean-slop/clean-slop
cd clean-slop
npm install
npm run build
npm test
```

### Adding a rule

1. Create `src/rules/<category>/<rule-name>.ts`
2. Implement the `Rule` interface (copy an existing rule as a template)
3. Add the `import` and include the rule in the array in `src/rules/index.ts`
4. Add unit tests in `tests/unit/`
5. Add a fixture case in `tests/fixtures/bad-code.ts` if applicable

### Rule implementation template

```typescript
import type { Rule } from '../../types.js';
import { traverse, getLocation } from '../../utils/ast.js';
import type { ASTNode } from '../../utils/ast.js';

const rule: Rule = {
  meta: {
    id: 'category/rule-name',
    name: 'Human Readable Name',
    category: 'security',
    severity: 'high',
    confidence: 'high',
    description: 'One sentence description of what the rule detects.',
    rationale: 'Why this pattern is problematic. What it indicates about the code.',
    docsUrl: 'https://clean-slop.dev/docs/rules/category/rule-name',
    fixable: false,
  },

  create(context) {
    traverse(context.ast, {
      CallExpression(node: ASTNode) {
        // Detection logic
        context.report({
          message: 'Short description of the finding.',
          explanation: 'Full explanation of what was found and why it is a problem.',
          impact: 'What happens in production if this is not fixed.',
          location: getLocation(node, context.filePath),
          fix: {
            description: 'How to fix this.',
            code: '// Example corrected code',
          },
        });
      },
    });
  },
};

export default rule;
```

### Commit convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add security/jwt-none-algorithm rule
fix: prevent false positive in ai-slop/fake-validation for arrow functions
docs: document prototype-pollution rule examples
test: add missing-await coverage for async arrow functions
refactor: extract shared string-literal detection into utils
perf: short-circuit rule engine for disabled categories
```

---

## Testing

```bash
# Run all tests once
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Run a specific file
npx vitest run tests/unit/security-rules.test.ts
```

### Writing rule tests

```typescript
import { describe, it, expect } from 'vitest';
import { parseSource } from '../../src/parsers/source-parser.js';
import { RuleEngine } from '../../src/rules/engine.js';
import { resolveConfig } from '../../src/config/loader.js';
import myRule from '../../src/rules/my-category/my-rule.js';

const config = resolveConfig({}, process.cwd());

function runRule(source: string) {
  const engine = new RuleEngine();
  engine.register(myRule);
  const parsed = parseSource('test.ts', source);
  return engine.runOnFile(parsed, config);
}

describe('my-category/my-rule', () => {
  it('flags the bad pattern', () => {
    const issues = runRule(`const x = badPattern();`);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.ruleId).toBe('my-category/my-rule');
    expect(issues[0]?.severity).toBe('high');
  });

  it('does not flag the acceptable pattern', () => {
    const issues = runRule(`const x = goodPattern();`);
    expect(issues).toHaveLength(0);
  });
});
```

### Test fixture

`tests/fixtures/bad-code.ts` contains one deliberately flawed TypeScript file that exercises all rule categories. Integration tests scan this file and verify that the expected number of issues are found and that the overall pipeline (discovery, parsing, rule execution, scoring, reporting) works correctly.

---

## Release Process

Releases are automated via the `.github/workflows/release.yml` GitHub Actions workflow.

### Manual release

```bash
# Ensure tests pass and build is clean
npm test && npm run build

# Bump the version (updates package.json and creates a git tag)
npm version patch   # 1.0.0 → 1.0.1
npm version minor   # 1.0.0 → 1.1.0
npm version major   # 1.0.0 → 2.0.0

# Push the tag to trigger the release workflow
git push origin main --follow-tags
```

The release workflow runs tests, builds, and publishes to npm with [npm provenance](https://docs.npmjs.com/generating-provenance-statements), then creates a GitHub Release with auto-generated notes.

### Setting up automated publishing

Add `NPM_TOKEN` as a repository secret under **Settings → Secrets and variables → Actions**. Obtain the token from npmjs.com under **Access Tokens → Generate New Token → Automation**.

---

## Troubleshooting

### Parse errors on valid files

clean-slop uses `@typescript-eslint/typescript-estree` for parsing. Some experimental syntax requires type information from a `tsconfig.json`. Run `clean-slop doctor` to verify the environment. Add problem files to the `exclude` array in configuration to skip them.

### Generated files producing many false positives

Add generated directories to the `exclude` array:

```javascript
exclude: [
  '**/__generated__/**',
  '**/*.generated.ts',
  '**/graphql/types.ts',
]
```

### Score is lower than expected

Run with `--verbose` to see the full explanation for each issue. Identify which category is pulling the score down. Use per-rule `'off'` overrides in configuration to disable rules that are not applicable to your project.

### The scan is slow

The majority of scan time is parsing. For very large projects (100k+ lines), increase the `exclude` list to skip directories that do not need scanning. Test and build output directories in particular should always be excluded.

### CI exits with code 1 but the output looks acceptable

Check whether `maxIssues` limits are being exceeded in addition to the score threshold. Run `clean-slop scan --verbose` locally to see the full issue list and determine which issues are triggering the failure.

---

## FAQ

### Does clean-slop replace ESLint?

No. ESLint enforces style, syntax, and correctness rules. clean-slop analyzes production readiness patterns, security vulnerabilities, and AI-generated code quality. They are complementary and recommended to be used together.

### Does clean-slop send my code anywhere?

No. All analysis runs entirely locally. No source code, ASTs, or scan results are transmitted to any external service.

### Can I use clean-slop on JavaScript projects (not TypeScript)?

Yes. clean-slop supports `.js`, `.jsx`, `.mjs`, and `.cjs` files. The parser handles both JavaScript and TypeScript syntax.

### Does clean-slop modify my code?

No. clean-slop is a read-only analysis tool. It reports issues and suggests fixes but never modifies files.

### What is the performance profile?

On a typical 50,000 line TypeScript project, a full scan completes in 2–5 seconds on modern hardware. The bottleneck is AST parsing.

### How do I disable a rule for a specific line?

Rule disabling at the line level is not currently supported. Use per-rule configuration in `clean-slop.config.js` to disable rules project-wide. Inline suppression is on the roadmap.

### Why is the security score 0 in my project?

Each critical issue deducts 20 points. Three critical issues bring the security score to 40. Five bring it to 0 regardless of other issues in the category. Review the critical security issues and address them — they represent real vulnerabilities.

### Can teams write shared rule sets?

Yes, via the plugin system. Publish a plugin as an npm package and add it to the `plugins` array in configuration. The plugin can include any number of custom rules.
