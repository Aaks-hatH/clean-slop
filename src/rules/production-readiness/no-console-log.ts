import type { Rule } from '../../types.js';
import { traverse, getLocation } from '../../utils/ast.js';
import type { ASTNode } from '../../utils/ast.js';

const DEBUG_METHODS = new Set([
  'console.log',
  'console.debug',
  'console.dir',
  'console.trace',
  'console.table',
]);

// These are acceptable in production
const ALLOWED_CONSOLE = new Set(['console.error', 'console.warn', 'console.info']);

const rule: Rule = {
  meta: {
    id: 'production-readiness/no-console-log',
    name: 'Console Debug Statement',
    category: 'production-readiness',
    severity: 'low',
    confidence: 'certain',
    description: 'Detects console.log and other debug console methods left in production code.',
    rationale:
      'Debug console statements leak internal application data, degrade performance, ' +
      'and indicate code that was not reviewed before shipping.',
    docsUrl: 'https://clean-slop.dev/docs/rules/production-readiness/no-console-log',
    fixable: true,
  },

  create(context) {
    traverse(context.ast, {
      CallExpression(node: ASTNode) {
        const callee = node.callee as ASTNode | undefined;
        if (!callee || callee.type !== 'MemberExpression') return;

        const obj = callee.object as ASTNode | undefined;
        const prop = callee.property as ASTNode | undefined;

        if (
          obj?.type !== 'Identifier' ||
          String(obj.name) !== 'console' ||
          prop?.type !== 'Identifier'
        ) {
          return;
        }

        const method = String(prop.name);
        const fullName = `console.${method}`;

        if (ALLOWED_CONSOLE.has(fullName)) return;

        if (DEBUG_METHODS.has(fullName)) {
          context.report({
            message: `${fullName}() should not be present in production code.`,
            explanation:
              `${fullName}() is a debug statement that was likely left over during development. ` +
              'Console output pollutes server logs, leaks internal state, and can expose ' +
              'sensitive data (tokens, user objects, query results) to log aggregation systems.',
            impact:
              'Debug logs appearing in production obscure real errors, violate data handling ' +
              'requirements, and may trigger compliance alerts for PII exposure.',
            location: getLocation(node, context.filePath),
            fix: {
              description:
                'Remove the console statement. For intentional logging, use a structured logger ' +
                '(pino, winston, bunyan) that supports log levels and structured output.',
              code: "import pino from 'pino';\n\nconst logger = pino();\nlogger.debug({ userId }, 'User lookup completed');",
            },
          });
        }
      },
    });
  },
};

export default rule;
