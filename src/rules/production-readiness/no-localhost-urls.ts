import type { Rule } from '../../types.js';
import type { ASTNode } from '../../utils/ast.js';

const LOCALHOST_PATTERN = /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?/i;
const DEBUG_FLAG_NAMES = /^(?:debug|DEBUG|isDebug|IS_DEBUG|debugMode|DEBUG_MODE|devMode|DEV_MODE|testMode|TEST_MODE)$/;
const MOCK_FUNCTION_NAMES = /^(?:mock|fake|stub|dummy|placeholder)[\w_]*/i;
const TEST_CREDENTIAL_PATTERNS = [
  /test[_-]?(password|secret|token|key)/i,
  /password\s*[:=]\s*['"](?:test|password|1234|admin|secret)['"]/i,
  /secret\s*[:=]\s*['"](?:test|secret|dev|development)['"]/i,
];

const rule: Rule = {
  meta: {
    id: 'production-readiness/no-localhost-urls',
    name: 'Localhost URL / Debug Flag / Mock Implementation',
    category: 'production-readiness',
    severity: 'medium',
    confidence: 'high',
    description:
      'Detects hardcoded localhost URLs, debug flags set to true, and mock/stub implementations.',
    rationale:
      'Localhost URLs, active debug flags, and mock implementations in source code are ' +
      'telltale signs that development shortcuts were committed to production.',
    docsUrl: 'https://clean-slop.dev/docs/rules/production-readiness/no-localhost-urls',
    fixable: false,
  },

  create(context) {
    // Scan raw source for localhost URLs and test credentials (line-by-line)
    const lines = context.source.split('\n');
    lines.forEach((line, index) => {
      if (LOCALHOST_PATTERN.test(line)) {
        context.report({
          message: 'Hardcoded localhost URL detected.',
          explanation:
            'This line contains a localhost URL. In production, this will fail to connect ' +
            'to the intended service because localhost resolves to the server itself.',
          impact:
            'API calls to localhost in production silently fail or hit incorrect services, ' +
            'causing user-facing errors and data integrity issues.',
          location: { file: context.filePath, line: index + 1, column: 0 },
          fix: {
            description:
              'Replace with an environment variable: process.env.API_BASE_URL or similar.',
            code: "const apiUrl = process.env.API_BASE_URL ?? 'https://api.yourdomain.com';",
          },
        });
      }

      for (const pattern of TEST_CREDENTIAL_PATTERNS) {
        if (pattern.test(line)) {
          context.report({
            message: 'Test or placeholder credential detected.',
            explanation:
              'This line appears to contain a test credential with an obvious value (e.g., "password", "secret"). ' +
              'Test credentials committed to source indicate authentication logic that was never hardened.',
            impact:
              'Test credentials in production allow unauthorized access. Obvious values like "test" or "1234" ' +
              'are among the first tried in credential stuffing attacks.',
            location: { file: context.filePath, line: index + 1, column: 0 },
            fix: {
              description:
                'Use environment variables for all credentials. Rotate any credential that has been committed.',
            },
          });
          break;
        }
      }
    });

    // AST-based checks
    traverse(context.ast, {
      // debug = true or DEBUG_MODE = true
      AssignmentExpression(node: ASTNode) {
        const left = node.left as ASTNode | undefined;
        const right = node.right as ASTNode | undefined;

        if (left?.type !== 'Identifier') return;
        if (!DEBUG_FLAG_NAMES.test(String(left.name))) return;
        if (right?.type !== 'Literal' || right.value !== true) return;

        context.report({
          message: `Debug flag "${left.name}" is set to true.`,
          explanation:
            `The variable "${left.name}" suggests a debug mode toggle that is hardcoded to true. ` +
            'Debug mode typically enables verbose logging, disables security checks, and activates ' +
            'development-only code paths.',
          impact:
            'Active debug flags in production expose internal state, disable security controls, ' +
            'and degrade performance through excessive logging.',
          location: getLocation(node, context.filePath),
          fix: {
            description:
              'Drive debug mode from an environment variable: const debug = process.env.DEBUG === "true";',
          },
        });
      },

      // Variable initializer: const debug = true
      VariableDeclarator(node: ASTNode) {
        const id = node.id as ASTNode | undefined;
        const init = node.init as ASTNode | undefined;

        if (id?.type !== 'Identifier') return;
        if (!DEBUG_FLAG_NAMES.test(String(id.name))) return;
        if (init?.type !== 'Literal' || init.value !== true) return;

        context.report({
          message: `Debug flag "${id.name}" initialized to true.`,
          explanation:
            `"${id.name}" is a debug flag initialized with true. ` +
            'This likely enables a development-only code path.',
          impact:
            'Debug mode active in production may disable security checks, ' +
            'expose stack traces to end users, or generate excessive log output.',
          location: getLocation(node, context.filePath),
          fix: {
            description:
              'Use an environment variable: const debug = process.env.NODE_ENV !== "production";',
          },
        });
      },

      // Function named mockX, fakeX, stubX
      FunctionDeclaration(node: ASTNode) {
        const id = node.id as ASTNode | undefined;
        if (!id || !MOCK_FUNCTION_NAMES.test(String(id.name))) return;

        context.report({
          message: `Function "${id.name}" appears to be a mock or stub implementation.`,
          explanation:
            `The name "${id.name}" suggests this is a placeholder implementation ` +
            'that was never replaced with a real one.',
          impact:
            'Mock implementations in production return fabricated data, bypassing real logic ' +
            'and producing incorrect results for end users.',
          location: getLocation(node, context.filePath),
          fix: {
            description:
              'Implement the real function or remove it entirely. Mock functions belong in test files only.',
          },
        });
      },
    });

    function traverse(ast: unknown, visitor: Record<string, (n: ASTNode) => void>): void {
      if (!ast || typeof ast !== 'object') return;
      const node = ast as ASTNode;
      if (typeof node.type === 'string') visitor[node.type]?.(node);
      for (const key of Object.keys(node)) {
        if (key === 'parent') continue;
        const child = node[key];
        if (Array.isArray(child)) {
          for (const item of child) traverse(item, visitor);
        } else if (child && typeof child === 'object' && 'type' in (child as object)) {
          traverse(child, visitor);
        }
      }
    }

    function getLocation(node: ASTNode, filePath: string) {
      return { file: filePath, line: node.loc?.start.line ?? 1, column: node.loc?.start.column ?? 0 };
    }
  },
};

export default rule;
