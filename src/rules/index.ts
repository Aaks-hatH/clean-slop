import type { Rule } from '../types.js';

// AI Slop rules
import emptyCatch from './ai-slop/empty-catch.js';
import todoImplementation from './ai-slop/todo-implementation.js';
import giantFunction from './ai-slop/giant-function.js';
import excessiveNesting from './ai-slop/excessive-nesting.js';
import fakeValidation from './ai-slop/fake-validation.js';
import highComplexity from './ai-slop/high-complexity.js';
import deadCode from './ai-slop/dead-code.js';

// Security rules
import unsafeEval from './security/unsafe-eval.js';
import hardcodedSecrets from './security/hardcoded-secrets.js';
import sqlInjection from './security/sql-injection.js';
import commandInjection from './security/command-injection.js';
import pathTraversal from './security/path-traversal.js';
import prototypePollution from './security/prototype-pollution.js';
import weakCrypto from './security/weak-crypto.js';
import dangerousCors from './security/dangerous-cors.js';

// Reliability rules
import unhandledPromise from './reliability/unhandled-promise.js';
import missingAwait from './reliability/missing-await.js';
import infiniteLoop from './reliability/infinite-loop.js';

// Maintainability rules
import giantFile from './maintainability/giant-file.js';
import circularImports from './maintainability/circular-imports.js';

// Production readiness rules
import noConsoleLog from './production-readiness/no-console-log.js';
import noLocalhostUrls from './production-readiness/no-localhost-urls.js';

export const BUILT_IN_RULES: Rule[] = [
  // AI Slop
  emptyCatch,
  todoImplementation,
  giantFunction,
  excessiveNesting,
  fakeValidation,
  highComplexity,
  deadCode,

  // Security
  unsafeEval,
  hardcodedSecrets,
  sqlInjection,
  commandInjection,
  pathTraversal,
  prototypePollution,
  weakCrypto,
  dangerousCors,

  // Reliability
  unhandledPromise,
  missingAwait,
  infiniteLoop,

  // Maintainability
  giantFile,
  circularImports,

  // Production Readiness
  noConsoleLog,
  noLocalhostUrls,
];

export { RuleEngine } from './engine.js';
