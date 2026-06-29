import type { Rule } from '../../types.js';
import { traverse, getLocation } from '../../utils/ast.js';
import type { ASTNode } from '../../utils/ast.js';

/**
 * Detects async functions that return a value without awaiting it,
 * or that call async functions without await inside them.
 *
 * Specifically looks for:
 *   async function foo() { return fetch('/api'); }  // should be: return await fetch(...)
 */

function isAsyncFunction(node: ASTNode): boolean {
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  ) && node.async === true;
}

const LIKELY_ASYNC = new Set([
  'fetch', 'readFile', 'writeFile', 'connect', 'query', 'execute',
  'findOne', 'find', 'save', 'create', 'update', 'delete',
  'sendMail', 'publish', 'subscribe',
]);

function looksAsync(node: ASTNode): boolean {
  if (node.type !== 'CallExpression') return false;

  const callee = node.callee as ASTNode | undefined;
  if (!callee) return false;

  if (callee.type === 'Identifier' && LIKELY_ASYNC.has(String(callee.name))) return true;

  if (callee.type === 'MemberExpression') {
    const prop = callee.property as ASTNode | undefined;
    if (prop?.type === 'Identifier' && LIKELY_ASYNC.has(String(prop.name))) return true;
  }

  return false;
}

const rule: Rule = {
  meta: {
    id: 'reliability/missing-await',
    name: 'Missing Await',
    category: 'reliability',
    severity: 'high',
    confidence: 'medium',
    description:
      'Detects async functions that return un-awaited Promises or call async APIs without await.',
    rationale:
      'Forgetting await is one of the most common async bugs in JavaScript. ' +
      'The function appears to return a value but actually returns a Promise, ' +
      'causing unexpected behavior in callers that expect a resolved value.',
    docsUrl: 'https://clean-slop.dev/docs/rules/reliability/missing-await',
    fixable: true,
  },

  create(context) {
    traverse(context.ast, {
      FunctionDeclaration: checkAsyncFn,
      FunctionExpression: checkAsyncFn,
      ArrowFunctionExpression: checkAsyncFn,
    });

    function checkAsyncFn(fn: ASTNode): void {
      if (!isAsyncFunction(fn)) return;

      const body = fn.body as ASTNode | undefined;
      if (!body) return;

      // Arrow function with expression body: async () => fetch(...)
      if (body.type !== 'BlockStatement') {
        if (looksAsync(body)) {
          context.report({
            message: 'Async arrow function returns a Promise without await.',
            explanation:
              'The expression body of this async arrow function appears to return a Promise directly. ' +
              'The outer async function wraps this in another Promise, which may not be what was intended.',
            impact:
              'Callers awaiting this function will receive a resolved Promise<Promise<T>> rather than T. ' +
              'This causes subtle type errors and may result in unhandled rejections.',
            location: getLocation(fn, context.filePath),
            fix: {
              description:
                'Add await to the expression body: async () => await fetch(...)',
              code: 'const getData = async () => await fetch("/api/data");',
            },
          });
        }
        return;
      }

      // Look for return statements that return un-awaited async calls
      const statements = (body as ASTNode & { body?: ASTNode[] }).body ?? [];

      for (const stmt of statements) {
        if (stmt.type !== 'ReturnStatement') continue;

        const returnArg = stmt.argument as ASTNode | undefined;
        if (!returnArg) continue;

        if (looksAsync(returnArg)) {
          context.report({
            message: 'Async function returns a Promise without await.',
            explanation:
              'This async function returns a likely-async call without awaiting it. ' +
              'While this compiles correctly, it loses error context and may cause confusing stack traces. ' +
              'In try/catch blocks, the catch will not trigger for the returned Promise.',
            impact:
              'In a try/catch block, exceptions from the returned Promise will not be caught ' +
              'by the surrounding catch clause. This creates invisible error-handling gaps.',
            location: getLocation(stmt, context.filePath),
            fix: {
              description:
                'Add await before the return value to ensure errors are caught properly.',
              code: 'return await someAsyncOperation();',
            },
          });
        }
      }
    }
  },
};

export default rule;
