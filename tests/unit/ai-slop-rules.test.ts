import { describe, it, expect } from 'vitest';
import { parseSource } from '../../src/parsers/source-parser.js';
import { RuleEngine } from '../../src/rules/engine.js';
import { resolveConfig } from '../../src/config/loader.js';
import emptyCatch from '../../src/rules/ai-slop/empty-catch.js';
import todoImplementation from '../../src/rules/ai-slop/todo-implementation.js';
import giantFunction from '../../src/rules/ai-slop/giant-function.js';
import fakeValidation from '../../src/rules/ai-slop/fake-validation.js';
import deadCode from '../../src/rules/ai-slop/dead-code.js';
import highComplexity from '../../src/rules/ai-slop/high-complexity.js';

function makeEngine(...rules: Parameters<RuleEngine['register']>[0][]) {
  const engine = new RuleEngine();
  for (const rule of rules) engine.register(rule);
  return engine;
}

const defaultConfig = resolveConfig({}, process.cwd());

function runRule(rule: Parameters<RuleEngine['register']>[0], source: string, filePath = 'test.ts') {
  const engine = makeEngine(rule);
  const parsed = parseSource(filePath, source);
  return engine.runOnFile(parsed, defaultConfig);
}

// ---------------------------------------------------------------------------
// empty-catch
// ---------------------------------------------------------------------------
describe('ai-slop/empty-catch', () => {
  it('flags an empty catch block', () => {
    const source = `
      try {
        doSomething();
      } catch (err) {
      }
    `;
    const issues = runRule(emptyCatch, source);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.ruleId).toBe('ai-slop/empty-catch');
  });

  it('does not flag a catch block with a statement', () => {
    const source = `
      try {
        doSomething();
      } catch (err) {
        console.error(err);
      }
    `;
    const issues = runRule(emptyCatch, source);
    expect(issues).toHaveLength(0);
  });

  it('does not flag a catch block that rethrows', () => {
    const source = `
      try {
        doSomething();
      } catch (err) {
        throw err;
      }
    `;
    const issues = runRule(emptyCatch, source);
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// todo-implementation
// ---------------------------------------------------------------------------
describe('ai-slop/todo-implementation', () => {
  it('flags TODO comments', () => {
    const source = `
      // TODO: implement this
      function foo() {}
    `;
    const issues = runRule(todoImplementation, source);
    expect(issues.some((i) => i.ruleId === 'ai-slop/todo-implementation')).toBe(true);
  });

  it('flags FIXME comments', () => {
    const source = `
      // FIXME: broken
      const x = 1;
    `;
    const issues = runRule(todoImplementation, source);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('flags throw new Error("Not implemented")', () => {
    const source = `
      function doWork() {
        throw new Error('Not implemented');
      }
    `;
    const issues = runRule(todoImplementation, source);
    expect(issues.some((i) => i.message.includes('Placeholder'))).toBe(true);
  });

  it('does not flag throw new Error with real messages', () => {
    const source = `
      function doWork() {
        throw new Error('Invalid argument: expected string');
      }
    `;
    const issues = runRule(todoImplementation, source);
    expect(issues.filter((i) => i.message.includes('Placeholder'))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// fake-validation
// ---------------------------------------------------------------------------
describe('ai-slop/fake-validation', () => {
  it('flags a validate function that returns true', () => {
    const source = `
      function validateEmail(email) {
        return true;
      }
    `;
    const issues = runRule(fakeValidation, source);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.ruleId).toBe('ai-slop/fake-validation');
  });

  it('does not flag a validate function with real logic', () => {
    const source = `
      function validateEmail(email) {
        return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
      }
    `;
    const issues = runRule(fakeValidation, source);
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// dead-code
// ---------------------------------------------------------------------------
describe('ai-slop/dead-code', () => {
  it('flags code after a return statement', () => {
    const source = `
      function foo() {
        return 1;
        const x = 2;
      }
    `;
    const issues = runRule(deadCode, source);
    expect(issues).toHaveLength(1);
  });

  it('flags code after a throw statement', () => {
    const source = `
      function foo() {
        throw new Error('oops');
        doCleanup();
      }
    `;
    const issues = runRule(deadCode, source);
    expect(issues).toHaveLength(1);
  });

  it('does not flag normal code flow', () => {
    const source = `
      function foo() {
        const x = 1;
        const y = 2;
        return x + y;
      }
    `;
    const issues = runRule(deadCode, source);
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// high-complexity
// ---------------------------------------------------------------------------
describe('ai-slop/high-complexity', () => {
  it('flags a highly complex function', () => {
    // Construct a function with > 10 branches
    const branches = Array.from({ length: 11 }, (_, i) => `if (x === ${i}) return ${i};`).join('\n');
    const source = `function complex(x) { ${branches} return -1; }`;
    const issues = runRule(highComplexity, source);
    expect(issues).toHaveLength(1);
  });

  it('does not flag a simple function', () => {
    const source = `
      function simple(x) {
        if (x > 0) return x;
        return -x;
      }
    `;
    const issues = runRule(highComplexity, source);
    expect(issues).toHaveLength(0);
  });
});
