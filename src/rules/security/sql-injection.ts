import type { Rule } from '../../types.js';
import { traverse, getLocation } from '../../utils/ast.js';
import type { ASTNode } from '../../utils/ast.js';

/**
 * Detects SQL injection vulnerabilities by looking for template literals or
 * string concatenation that embeds variables into SQL query strings.
 *
 * Patterns detected:
 *   db.query(`SELECT * FROM users WHERE id = ${userId}`)
 *   db.query("SELECT * FROM users WHERE id = " + userId)
 *   connection.execute("INSERT INTO " + tableName + " VALUES (?)")
 */

const SQL_KEYWORDS = /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|FROM|WHERE|JOIN)\b/i;

const SQL_CALL_PATTERNS = [
  'query', 'execute', 'exec', 'run', 'prepare', 'raw',
  'db.query', 'db.execute', 'pool.query', 'connection.query',
  'knex.raw', 'sequelize.query',
];

function looksLikeSqlCall(node: ASTNode): boolean {
  const callee = node.callee as ASTNode | undefined;
  if (!callee) return false;

  if (callee.type === 'Identifier') {
    return SQL_CALL_PATTERNS.includes(String(callee.name));
  }

  if (callee.type === 'MemberExpression') {
    const prop = callee.property as ASTNode | undefined;
    if (prop?.type === 'Identifier') {
      return SQL_CALL_PATTERNS.some((p) => p.endsWith(`.${prop.name}`) || p === prop.name);
    }
  }

  return false;
}

function containsSqlKeywords(str: string): boolean {
  return SQL_KEYWORDS.test(str);
}

function getTemplateRawContent(node: ASTNode): string {
  const quasis = (node.quasis as ASTNode[] | undefined) ?? [];
  return quasis
    .map((q) => {
      const val = q.value as Record<string, unknown> | undefined;
      return String(val?.cooked ?? val?.raw ?? '');
    })
    .join('...');
}

const rule: Rule = {
  meta: {
    id: 'security/sql-injection',
    name: 'SQL Injection',
    category: 'security',
    severity: 'critical',
    confidence: 'high',
    description:
      'Detects SQL queries built with string concatenation or template literals containing variables.',
    rationale:
      'SQL injection remains the most prevalent web application vulnerability. ' +
      'Embedding JavaScript variables directly into SQL strings gives attackers control ' +
      'over query structure.',
    docsUrl: 'https://clean-slop.dev/docs/rules/security/sql-injection',
    fixable: false,
  },

  create(context) {
    traverse(context.ast, {
      CallExpression(node: ASTNode) {
        if (!looksLikeSqlCall(node)) return;

        const args = (node.arguments as ASTNode[] | undefined) ?? [];
        const firstArg = args[0] as ASTNode | undefined;
        if (!firstArg) return;

        // Check template literal with expressions: `SELECT ... ${variable}`
        if (firstArg.type === 'TemplateLiteral') {
          const expressions = (firstArg.expressions as ASTNode[] | undefined) ?? [];
          if (expressions.length === 0) return;

          const rawContent = getTemplateRawContent(firstArg);
          if (!containsSqlKeywords(rawContent)) return;

          context.report({
            message: 'Possible SQL injection: template literal with expressions passed to query function.',
            explanation:
              'This SQL query is built using a template literal that embeds JavaScript variables. ' +
              'If any of the interpolated values derive from user input, an attacker can alter the ' +
              'query structure by injecting SQL syntax.',
            impact:
              'SQL injection can lead to unauthorized data access, data modification, ' +
              'authentication bypass, and in some configurations, remote code execution on the database server.',
            location: getLocation(node, context.filePath),
            fix: {
              description:
                'Use parameterized queries or prepared statements. ' +
                'Pass user-controlled values as parameters, never as part of the SQL string.',
              code:
                '// Instead of:\n' +
                '// db.query(`SELECT * FROM users WHERE id = ${userId}`)\n\n' +
                '// Use parameterized queries:\n' +
                'db.query("SELECT * FROM users WHERE id = ?", [userId])',
            },
          });
        }

        // Check string concatenation: "SELECT..." + variable
        if (firstArg.type === 'BinaryExpression' && firstArg.operator === '+') {
          const leftStr = extractLeftmostString(firstArg);
          if (leftStr && containsSqlKeywords(leftStr)) {
            context.report({
              message: 'Possible SQL injection: string concatenation in SQL query.',
              explanation:
                'This SQL query is constructed by concatenating strings and variables. ' +
                'Variables injected into a SQL string allow attackers to manipulate the query.',
              impact:
                'SQL injection can expose the entire database, bypass authentication, ' +
                'and enable destructive operations (DROP TABLE, etc.).',
              location: getLocation(node, context.filePath),
              fix: {
                description:
                  'Replace string concatenation with parameterized queries. ' +
                  'Never construct SQL from variables.',
                code:
                  'db.query(\n  "SELECT * FROM users WHERE name = ? AND role = ?",\n  [userName, userRole]\n)',
              },
            });
          }
        }
      },
    });

    function extractLeftmostString(node: ASTNode): string | null {
      if (node.type === 'Literal' && typeof node.value === 'string') {
        return node.value;
      }
      if (node.type === 'BinaryExpression' && node.operator === '+') {
        return extractLeftmostString(node.left as ASTNode);
      }
      return null;
    }
  },
};

export default rule;
