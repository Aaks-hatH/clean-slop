import { describe, it, expect } from 'vitest';
import { parseSource } from '../../src/parsers/source-parser.js';
import { RuleEngine } from '../../src/rules/engine.js';
import { resolveConfig } from '../../src/config/loader.js';
import unsafeEval from '../../src/rules/security/unsafe-eval.js';
import hardcodedSecrets from '../../src/rules/security/hardcoded-secrets.js';
import sqlInjection from '../../src/rules/security/sql-injection.js';
import commandInjection from '../../src/rules/security/command-injection.js';
import weakCrypto from '../../src/rules/security/weak-crypto.js';
import dangerousCors from '../../src/rules/security/dangerous-cors.js';

const defaultConfig = resolveConfig({}, process.cwd());

function runRule(rule: Parameters<RuleEngine['register']>[0], source: string, filePath = 'test.ts') {
  const engine = new RuleEngine();
  engine.register(rule);
  const parsed = parseSource(filePath, source);
  return engine.runOnFile(parsed, defaultConfig);
}

// ---------------------------------------------------------------------------
// unsafe-eval
// ---------------------------------------------------------------------------
describe('security/unsafe-eval', () => {
  it('flags eval()', () => {
    const source = `eval(userInput);`;
    const issues = runRule(unsafeEval, source);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe('critical');
  });

  it('flags new Function()', () => {
    const source = `const fn = new Function('return 1');`;
    const issues = runRule(unsafeEval, source);
    expect(issues).toHaveLength(1);
  });

  it('does not flag JSON.parse()', () => {
    const source = `const data = JSON.parse(input);`;
    const issues = runRule(unsafeEval, source);
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// hardcoded-secrets
// ---------------------------------------------------------------------------
describe('security/hardcoded-secrets', () => {
  it('flags AWS access key pattern', () => {
    const source = `const key = 'AKIAIOSFODNN7EXAMPLE123';`;
    const issues = runRule(hardcodedSecrets, source);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('flags database connection string with credentials', () => {
    const source = `const uri = 'mongodb://user:password123@prod.host.com/db';`;
    const issues = runRule(hardcodedSecrets, source);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('does not flag process.env references', () => {
    const source = `const key = process.env.API_KEY;`;
    const issues = runRule(hardcodedSecrets, source);
    expect(issues).toHaveLength(0);
  });

  it('does not flag obvious placeholder values', () => {
    const source = `const secret = 'your-secret-here';`;
    const issues = runRule(hardcodedSecrets, source);
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// sql-injection
// ---------------------------------------------------------------------------
describe('security/sql-injection', () => {
  it('flags template literal SQL with variable', () => {
    const source = `db.query(\`SELECT * FROM users WHERE id = \${userId}\`);`;
    const issues = runRule(sqlInjection, source);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.ruleId).toBe('security/sql-injection');
  });

  it('flags string concatenation in SQL', () => {
    const source = `db.query("SELECT * FROM users WHERE name = " + userName);`;
    const issues = runRule(sqlInjection, source);
    expect(issues).toHaveLength(1);
  });

  it('does not flag parameterized queries', () => {
    const source = `db.query("SELECT * FROM users WHERE id = ?", [userId]);`;
    const issues = runRule(sqlInjection, source);
    expect(issues).toHaveLength(0);
  });

  it('does not flag static SQL strings', () => {
    const source = `db.query("SELECT * FROM users");`;
    const issues = runRule(sqlInjection, source);
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// command-injection
// ---------------------------------------------------------------------------
describe('security/command-injection', () => {
  it('flags exec with template literal containing variable', () => {
    const source = `exec(\`ls \${userPath}\`);`;
    const issues = runRule(commandInjection, source);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe('critical');
  });

  it('does not flag exec with a static string', () => {
    const source = `exec('ls -la');`;
    const issues = runRule(commandInjection, source);
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// weak-crypto
// ---------------------------------------------------------------------------
describe('security/weak-crypto', () => {
  it('flags Math.random()', () => {
    const source = `const token = Math.random().toString(36);`;
    const issues = runRule(weakCrypto, source);
    expect(issues).toHaveLength(1);
  });

  it('flags MD5 usage', () => {
    const source = `crypto.createHash('md5').update(data).digest('hex');`;
    const issues = runRule(weakCrypto, source);
    expect(issues).toHaveLength(1);
  });

  it('flags SHA1 usage', () => {
    const source = `crypto.createHash('sha1').update(data).digest('hex');`;
    const issues = runRule(weakCrypto, source);
    expect(issues).toHaveLength(1);
  });

  it('does not flag SHA-256', () => {
    const source = `crypto.createHash('sha256').update(data).digest('hex');`;
    const issues = runRule(weakCrypto, source);
    expect(issues).toHaveLength(0);
  });

  it('does not flag crypto.randomBytes()', () => {
    const source = `const token = crypto.randomBytes(32).toString('hex');`;
    const issues = runRule(weakCrypto, source);
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// dangerous-cors
// ---------------------------------------------------------------------------
describe('security/dangerous-cors', () => {
  it('flags cors({ origin: "*" })', () => {
    const source = `app.use(cors({ origin: '*' }));`;
    const issues = runRule(dangerousCors, source);
    expect(issues).toHaveLength(1);
  });

  it('flags cors({ origin: true })', () => {
    const source = `app.use(cors({ origin: true }));`;
    const issues = runRule(dangerousCors, source);
    expect(issues).toHaveLength(1);
  });

  it('does not flag cors with specific origin', () => {
    const source = `app.use(cors({ origin: 'https://myapp.com' }));`;
    const issues = runRule(dangerousCors, source);
    expect(issues).toHaveLength(0);
  });

  it('flags cookie with httpOnly: false', () => {
    const source = `res.cookie('session', token, { httpOnly: false, secure: true });`;
    const issues = runRule(dangerousCors, source);
    expect(issues.some((i) => i.message.includes('httpOnly'))).toBe(true);
  });
});
