import type { Rule } from '../../types.js';
import { traverse, getLocation } from '../../utils/ast.js';
import type { ASTNode } from '../../utils/ast.js';

/**
 * Detects Promise-returning calls that are not awaited, .catch()'d, or returned.
 *
 * Common patterns:
 *   someAsyncFn();            // fire-and-forget without handling rejection
 *   fetch('/api/data');       // not awaited, not .catch()'d
 *   Promise.all([...]);       // result not used
 */

const KNOWN_ASYNC_APIS = new Set([
  'fetch',
  'axios',
  'mongoose.connect',
  'connect',
  'disconnect',
  'save',
  'create',
  'find',
  'findOne',
  'findById',
  'update',
  'updateOne',
  'deleteOne',
  'remove',
  'sendMail',
  'publish',
  'subscribe',
  'emit',
  'send',
  'write',
  'close',
  'end',
  'open',
  'connect',
  'mkdir',
  'unlink',
  'copyFile',
  'rename',
  'readFile',
  'writeFile',
  'appendFile',
]);

function getCallName(node: ASTNode): string | null {
  const callee = node.callee as ASTNode | undefined;
  if (!callee) return null;

  if (callee.type === 'Identifier') return String(callee.name);

  if (callee.type === 'MemberExpression') {
    const prop = callee.property as ASTNode | undefined;
    if (prop?.type === 'Identifier') return String(prop.name);
  }

  return null;
}

function isPromiseChained(node: ASTNode): boolean {
  // Check if the parent is a .then() or .catch() or .finally() call
  const parent = node.parent as ASTNode | undefined;
  if (!parent) return false;

  if (
    parent.type === 'MemberExpression' ||
    parent.type === 'CallExpression'
  ) {
    return true;
  }

  // Check if it's in an await expression
  if (parent.type === 'AwaitExpression') return true;

  // Check if it's in a return statement
  if (parent.type === 'ReturnStatement') return true;

  // Check if it's assigned
  if (parent.type === 'VariableDeclarator') return true;
  if (parent.type === 'AssignmentExpression') return true;

  return false;
}

const rule: Rule = {
  meta: {
    id: 'reliability/unhandled-promise',
    name: 'Unhandled Promise',
    category: 'reliability',
    severity: 'high',
    confidence: 'medium',
    description:
      'Detects Promise-returning function calls that are not awaited, returned, or error-handled.',
    rationale:
      'Unhandled Promise rejections crash Node.js processes in versions >= 15 and cause ' +
      'silent failures in older versions. Fire-and-forget async calls hide errors that should ' +
      'be surfaced to callers.',
    docsUrl: 'https://clean-slop.dev/docs/rules/reliability/unhandled-promise',
    fixable: false,
  },

  create(context) {
    // We look for ExpressionStatement → CallExpression where the call
    // is likely async but the result is not used.
    traverse(context.ast, {
      ExpressionStatement(node: ASTNode) {
        const expr = node.expression as ASTNode | undefined;
        if (!expr || expr.type !== 'CallExpression') return;

        const name = getCallName(expr);
        if (!name) return;

        if (!KNOWN_ASYNC_APIS.has(name)) return;

        // Check if it's inside an async context
        // We approximate: if expression is used standalone, it's fire-and-forget
        if (isPromiseChained(expr)) return;

        context.report({
          message: `Possible unhandled Promise: result of ${name}() is not awaited or handled.`,
          explanation:
            `${name}() likely returns a Promise, but the result is discarded. ` +
            'If this Promise rejects, the error will be swallowed or crash the process.',
          impact:
            'Unhandled rejections in production cause process crashes (Node.js >= 15) or ' +
            'silent data loss. Operations you expect to complete may silently fail.',
          location: getLocation(expr, context.filePath),
          fix: {
            description:
              'Await the Promise inside an async function, or add .catch() to handle rejection explicitly.',
            code:
              '// Option 1: await in an async function\nawait someAsyncFn();\n\n// Option 2: explicit catch\nsomeAsyncFn().catch((err) => {\n  logger.error("Operation failed:", err);\n});',
          },
        });
      },
    });
  },
};

export default rule;
