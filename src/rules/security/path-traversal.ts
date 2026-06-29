import type { Rule } from '../../types.js';
import { traverse, getLocation, getCalleeName } from '../../utils/ast.js';
import type { ASTNode } from '../../utils/ast.js';

const FS_WRITE_METHODS = new Set([
  'readFile', 'readFileSync', 'writeFile', 'writeFileSync',
  'readdir', 'readdirSync', 'createReadStream', 'createWriteStream',
  'unlink', 'unlinkSync', 'stat', 'statSync', 'access', 'accessSync',
  'open', 'openSync',
]);

const PATH_JOIN_CALLS = new Set(['join', 'resolve', 'normalize']);

function isPathJoinWithVariable(node: ASTNode): boolean {
  const callee = node.callee as ASTNode | undefined;
  if (!callee || callee.type !== 'MemberExpression') return false;

  const obj = callee.object as ASTNode | undefined;
  const prop = callee.property as ASTNode | undefined;

  if (obj?.type !== 'Identifier' || String(obj.name) !== 'path') return false;
  if (prop?.type !== 'Identifier' || !PATH_JOIN_CALLS.has(String(prop.name))) return false;

  const args = (node.arguments as ASTNode[] | undefined) ?? [];
  return args.some((arg) => arg.type !== 'Literal');
}

function isFsCallWithDynamicPath(node: ASTNode): boolean {
  const callee = node.callee as ASTNode | undefined;
  if (!callee) return false;

  let methodName: string | null = null;

  if (callee.type === 'MemberExpression') {
    const prop = callee.property as ASTNode | undefined;
    if (prop?.type === 'Identifier') methodName = String(prop.name);
  } else if (callee.type === 'Identifier') {
    methodName = String(callee.name);
  }

  if (!methodName || !FS_WRITE_METHODS.has(methodName)) return false;

  const args = (node.arguments as ASTNode[] | undefined) ?? [];
  const first = args[0] as ASTNode | undefined;
  if (!first) return false;

  return first.type !== 'Literal';
}

const rule: Rule = {
  meta: {
    id: 'security/path-traversal',
    name: 'Path Traversal',
    category: 'security',
    severity: 'critical',
    confidence: 'medium',
    description:
      'Detects file system operations with dynamic paths that may allow path traversal attacks.',
    rationale:
      'Path traversal occurs when an attacker uses "../" sequences in user-controlled input ' +
      'to escape the intended directory and access arbitrary files.',
    docsUrl: 'https://clean-slop.dev/docs/rules/security/path-traversal',
    fixable: false,
  },

  create(context) {
    traverse(context.ast, {
      CallExpression(node: ASTNode) {
        if (isFsCallWithDynamicPath(node)) {
          const callee = node.callee as ASTNode;
          const prop = callee.type === 'MemberExpression'
            ? String((callee.property as ASTNode).name)
            : String((callee as ASTNode).name);

          context.report({
            message: `Possible path traversal: dynamic path passed to fs.${prop}().`,
            explanation:
              `${prop}() is called with a non-literal path argument. ` +
              'If this path is influenced by user input without sanitization, ' +
              'an attacker can use "../" sequences to escape the intended directory.',
            impact:
              'Successful path traversal allows reading sensitive system files (/etc/passwd, .env, ' +
              'private keys), writing malicious content to arbitrary locations, or deleting critical files.',
            location: getLocation(node, context.filePath),
            fix: {
              description:
                'Resolve the path and verify it begins with the intended base directory before use.',
              code:
                "import path from 'path';\n\nconst baseDir = path.resolve('./uploads');\nconst safePath = path.resolve(baseDir, userInput);\n\nif (!safePath.startsWith(baseDir + path.sep)) {\n  throw new Error('Path traversal detected');\n}\n\nfs.readFile(safePath, 'utf-8');",
            },
          });
        }
      },
    });
  },
};

export default rule;
