import { describe, it, expect } from 'vitest';
import { parseSource } from '../../src/parsers/source-parser.js';
import { RuleEngine } from '../../src/rules/engine.js';
import { resolveConfig } from '../../src/config/loader.js';
import unhandledPromise from '../../src/rules/reliability/unhandled-promise.js';
import infiniteLoop from '../../src/rules/reliability/infinite-loop.js';
import noConsoleLog from '../../src/rules/production-readiness/no-console-log.js';
import noLocalhostUrls from '../../src/rules/production-readiness/no-localhost-urls.js';

const defaultConfig = resolveConfig({}, process.cwd());

function runRule(rule: Parameters<RuleEngine['register']>[0], source: string) {
  const engine = new RuleEngine();
  engine.register(rule);
  const parsed = parseSource('test.ts', source);
  return engine.runOnFile(parsed, defaultConfig);
}

// ---------------------------------------------------------------------------
// unhandled-promise
// ---------------------------------------------------------------------------
describe('reliability/unhandled-promise', () => {
  it('flags fire-and-forget fetch()', () => {
    const source = `
      function getData() {
        fetch('/api/data');
      }
    `;
    const issues = runRule(unhandledPromise, source);
    expect(issues).toHaveLength(1);
  });

  it('does not flag awaited fetch()', () => {
    const source = `
      async function getData() {
        const res = await fetch('/api/data');
        return res.json();
      }
    `;
    const issues = runRule(unhandledPromise, source);
    expect(issues).toHaveLength(0);
  });

  it('does not flag fetch with .then()', () => {
    const source = `
      fetch('/api/data').then(res => res.json()).catch(console.error);
    `;
    const issues = runRule(unhandledPromise, source);
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// infinite-loop
// ---------------------------------------------------------------------------
describe('reliability/infinite-loop', () => {
  it('flags while(true) with no break', () => {
    const source = `
      function poll() {
        while (true) {
          doWork();
        }
      }
    `;
    const issues = runRule(infiniteLoop, source);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.ruleId).toBe('reliability/infinite-loop');
  });

  it('does not flag while(true) with a break', () => {
    const source = `
      function poll() {
        while (true) {
          const result = doWork();
          if (result.done) break;
        }
      }
    `;
    const issues = runRule(infiniteLoop, source);
    expect(issues).toHaveLength(0);
  });

  it('does not flag while(true) with a return', () => {
    const source = `
      function poll() {
        while (true) {
          if (isDone()) return;
          doWork();
        }
      }
    `;
    const issues = runRule(infiniteLoop, source);
    expect(issues).toHaveLength(0);
  });

  it('flags for(;;) with no break', () => {
    const source = `
      for (;;) {
        spin();
      }
    `;
    const issues = runRule(infiniteLoop, source);
    expect(issues).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// no-console-log
// ---------------------------------------------------------------------------
describe('production-readiness/no-console-log', () => {
  it('flags console.log()', () => {
    const source = `console.log('debug info', data);`;
    const issues = runRule(noConsoleLog, source);
    expect(issues).toHaveLength(1);
  });

  it('flags console.debug()', () => {
    const source = `console.debug('trace');`;
    const issues = runRule(noConsoleLog, source);
    expect(issues).toHaveLength(1);
  });

  it('does not flag console.error()', () => {
    const source = `console.error('Something went wrong:', err);`;
    const issues = runRule(noConsoleLog, source);
    expect(issues).toHaveLength(0);
  });

  it('does not flag console.warn()', () => {
    const source = `console.warn('Deprecated API used');`;
    const issues = runRule(noConsoleLog, source);
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// no-localhost-urls
// ---------------------------------------------------------------------------
describe('production-readiness/no-localhost-urls', () => {
  it('flags http://localhost:3000', () => {
    const source = `const BASE_URL = 'http://localhost:3000';`;
    const issues = runRule(noLocalhostUrls, source);
    expect(issues.some((i) => i.message.includes('localhost'))).toBe(true);
  });

  it('flags http://127.0.0.1', () => {
    const source = `const url = 'http://127.0.0.1/api';`;
    const issues = runRule(noLocalhostUrls, source);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('flags debug = true assignment', () => {
    const source = `const debug = true;`;
    const issues = runRule(noLocalhostUrls, source);
    expect(issues.some((i) => i.message.includes('debug'))).toBe(true);
  });

  it('does not flag production URLs', () => {
    const source = `const url = 'https://api.myapp.com';`;
    const issues = runRule(noLocalhostUrls, source);
    expect(issues.filter((i) => i.message.includes('localhost'))).toHaveLength(0);
  });
});
