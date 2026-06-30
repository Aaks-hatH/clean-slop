import type { Rule } from '../../types.js';
import { traverse, getLocation } from '../../utils/ast.js';
import type { ASTNode } from '../../utils/ast.js';

/**
 * Detects validation functions that always return true or do nothing meaningful.
 *
 * Common AI-generated pattern:
 *   function validateEmail(email) { return email.includes('@'); }
 *   function isValid(data) { return true; }
 */

const VALIDATION_NAME_PATTERN = /^(validate|isValid|check|verify|sanitize|assert)/i;

const rule: Rule = {
  meta: {
    id: 'ai-slop/fake-validation',
    name: 'Fake Validation',
    category: 'ai-slop',
    severity: 'high',
    confidence: 'medium',
    description:
      'Detects validation functions that trivially return true without meaningful checks.',
    rationale:
      'AI code generators often produce validation functions with names that imply safety ' +
      'but bodies that unconditionally approve all input. This creates a false sense of security.',
    docsUrl: 'https://clean-slop.dev/docs/rules/ai-slop/fake-validation',
    fixable: false,
  },

  create(context) {
    traverse(context.ast, {
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression: checkFunction,
    });

    function checkFunction(node: ASTNode): void {
      const idNode = (node.id ?? (node.parent as ASTNode | undefined)?.id) as ASTNode | undefined;

      let name: string | null = null;

      // Named function
      if (idNode?.type === 'Identifier') {
        name = String(idNode.name);
      }

      // Variable declarator: const validateX = () => ...
      const parent = node.parent as ASTNode | undefined;
      if (!name && parent?.type === 'VariableDeclarator') {
        const idPart = parent.id as ASTNode | undefined;
        if (idPart?.type === 'Identifier') {
          name = String(idPart.name);
        }
      }

      if (!name || !VALIDATION_NAME_PATTERN.test(name)) return;

      const body = node.body as ASTNode | undefined;
      if (!body) return;

      // Arrow function with expression body: const isValid = () => true
      if (body.type !== 'BlockStatement') {
        if (body.type === 'Literal' && body.value === true) {
          reportFakeValidation(node, name);
        }
        return;
      }

      const statements = (body as ASTNode & { body?: unknown[] }).body ?? [];

      // Single return true;
      if (statements.length === 1) {
        const stmt = statements[0] as ASTNode;
        if (stmt.type === 'ReturnStatement') {
          const arg = stmt.argument as ASTNode | undefined;
          if (arg?.type === 'Literal' && arg.value === true) {
            reportFakeValidation(node, name);
          }
        }
      }
    }

    function reportFakeValidation(node: ASTNode, name: string): void {
      context.report({
        message: `"${name}" appears to be a fake validation function that always returns true.`,
        explanation:
          `The function "${name}" has a name suggesting it performs validation, ` +
          'but its body unconditionally returns true. All inputs will pass validation.',
        impact:
          'Fake validation creates false security. Malicious or malformed input bypasses ' +
          'what appears to be a safety check, potentially causing data corruption or security breaches.',
        location: getLocation(node, context.filePath),
        fix: {
          description:
            'Implement real validation logic that checks the input against expected constraints. ' +
            'Use a validation library such as zod, joi, or yup for complex schemas.',
        },
      });
    }
  },
};

export default rule;
