import type { Rule } from '../../types.js';
import { traverse, getLocation } from '../../utils/ast.js';
import type { ASTNode } from '../../utils/ast.js';

const WEAK_HASH_ALGORITHMS = new Set(['md5', 'sha1', 'sha-1', 'md4', 'rc4', 'des', '3des']);
const WEAK_CIPHER_MODES = new Set(['ecb', 'cbc']); // ECB is never safe; CBC needs IV validation

const MATH_RANDOM_DESC =
  'Math.random() is a pseudo-random number generator not suitable for cryptographic use.';

const rule: Rule = {
  meta: {
    id: 'security/weak-crypto',
    name: 'Weak Cryptography',
    category: 'security',
    severity: 'high',
    confidence: 'high',
    description:
      'Detects use of weak or broken cryptographic algorithms (MD5, SHA1, ECB mode, Math.random).',
    rationale:
      'MD5 and SHA1 are cryptographically broken. Using them for password hashing or data ' +
      'integrity provides no real security. Math.random() is predictable and must not be used ' +
      'for tokens, keys, or any security-sensitive value.',
    docsUrl: 'https://clean-slop.dev/docs/rules/security/weak-crypto',
    fixable: false,
  },

  create(context) {
    traverse(context.ast, {
      CallExpression(node: ASTNode) {
        const callee = node.callee as ASTNode | undefined;
        if (!callee) return;

        // Math.random()
        if (
          callee.type === 'MemberExpression' &&
          (callee.object as ASTNode)?.type === 'Identifier' &&
          String((callee.object as ASTNode).name) === 'Math' &&
          (callee.property as ASTNode)?.type === 'Identifier' &&
          String((callee.property as ASTNode).name) === 'random'
        ) {
          context.report({
            message: 'Math.random() is not cryptographically secure.',
            explanation: MATH_RANDOM_DESC,
            impact:
              'Using Math.random() for security tokens, session IDs, or passwords produces ' +
              'predictable values that attackers can guess or enumerate.',
            location: getLocation(node, context.filePath),
            fix: {
              description: 'Use the Web Crypto API or Node.js crypto module for secure random values.',
              code:
                "// Node.js:\nimport { randomBytes } from 'crypto';\nconst token = randomBytes(32).toString('hex');\n\n// Browser:\nconst array = new Uint8Array(32);\ncrypto.getRandomValues(array);",
            },
          });
        }

        // crypto.createHash('md5') / crypto.createHash('sha1')
        if (
          callee.type === 'MemberExpression' &&
          (callee.property as ASTNode)?.type === 'Identifier' &&
          String((callee.property as ASTNode).name) === 'createHash'
        ) {
          const args = (node.arguments as ASTNode[] | undefined) ?? [];
          const algoArg = args[0] as ASTNode | undefined;

          if (algoArg?.type === 'Literal') {
            const algo = String(algoArg.value).toLowerCase();
            if (WEAK_HASH_ALGORITHMS.has(algo)) {
              context.report({
                message: `Weak hash algorithm "${algoArg.value}" used in createHash().`,
                explanation:
                  `${algoArg.value} is a broken hash algorithm. ` +
                  'It is vulnerable to collision attacks and should not be used for ' +
                  'data integrity checks, password hashing, or digital signatures.',
                impact:
                  'Broken hash algorithms allow attackers to forge hashes, bypass integrity checks, ' +
                  'and crack password hashes rapidly using precomputed tables.',
                location: getLocation(node, context.filePath),
                fix: {
                  description:
                    "Replace with SHA-256 or SHA-3 for general hashing: crypto.createHash('sha256'). " +
                    'For password hashing, use bcrypt, argon2, or scrypt instead of any raw hash.',
                },
              });
            }
          }
        }

        // crypto.createCipheriv with ECB or CBC mode
        if (
          callee.type === 'MemberExpression' &&
          (callee.property as ASTNode)?.type === 'Identifier' &&
          String((callee.property as ASTNode).name) === 'createCipheriv'
        ) {
          const args = (node.arguments as ASTNode[] | undefined) ?? [];
          const algoArg = args[0] as ASTNode | undefined;

          if (algoArg?.type === 'Literal') {
            const algo = String(algoArg.value).toLowerCase();
            if ([...WEAK_CIPHER_MODES].some((m) => algo.includes(m))) {
              context.report({
                message: `Insecure cipher mode detected: "${algoArg.value}".`,
                explanation:
                  `AES-ECB produces identical ciphertext for identical plaintext blocks, ` +
                  'revealing patterns in encrypted data. AES-CBC is also prone to padding oracle attacks.',
                impact:
                  'Insecure cipher modes can expose plaintext structure to passive observers ' +
                  'and may be fully decryptable by an active attacker.',
                location: getLocation(node, context.filePath),
                fix: {
                  description:
                    "Use AES-GCM (Authenticated Encryption): crypto.createCipheriv('aes-256-gcm', key, iv). " +
                    'Always use a unique IV per encryption operation.',
                },
              });
            }
          }
        }
      },
    });
  },
};

export default rule;
