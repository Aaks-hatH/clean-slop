/**
 * Lightweight AST traversal utilities that work with the
 * @typescript-eslint/typescript-estree AST format.
 */

export type ASTNode = Record<string, unknown> & {
  type: string;
  loc?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
};

export type Visitor = {
  [nodeType: string]: (node: ASTNode) => void;
};

/**
 * Walk an AST depth-first, calling visitor handlers by node type.
 */
export function traverse(ast: unknown, visitor: Visitor): void {
  if (!ast || typeof ast !== 'object') return;

  const node = ast as ASTNode;

  if (typeof node.type === 'string') {
    const handler = visitor[node.type];
    if (handler) handler(node);

    const wildcard = visitor['*'];
    if (wildcard) wildcard(node);
  }

  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        traverse(item, visitor);
      }
    } else if (child && typeof child === 'object' && 'type' in (child as object)) {
      traverse(child, visitor);
    }
  }
}

/**
 * Collect all nodes of a given type from an AST subtree.
 */
export function findAll(ast: unknown, nodeType: string): ASTNode[] {
  const results: ASTNode[] = [];
  traverse(ast, {
    [nodeType](node) {
      results.push(node);
    },
  });
  return results;
}

/**
 * Find the first node of a given type.
 */
export function findFirst(ast: unknown, nodeType: string): ASTNode | null {
  for (const node of findAll(ast, nodeType)) {
    return node;
  }
  return null;
}

/**
 * Get the start location of a node, with safe fallback.
 */
export function getLocation(
  node: ASTNode,
  filePath: string,
): { file: string; line: number; column: number } {
  return {
    file: filePath,
    line: node.loc?.start.line ?? 1,
    column: node.loc?.start.column ?? 0,
  };
}

/**
 * Get a string value from a node's property if it is a string literal.
 */
export function getStringValue(node: ASTNode | unknown): string | null {
  if (!node || typeof node !== 'object') return null;
  const n = node as ASTNode;
  if (n.type === 'Literal' && typeof n.value === 'string') return n.value;
  if (n.type === 'TemplateLiteral') {
    const quasis = n.quasis as ASTNode[] | undefined;
    if (quasis && quasis.length === 1) {
      const cooked = (quasis[0] as Record<string, unknown>)?.value as
        Record<string, unknown> | undefined;
      if (typeof cooked?.cooked === 'string') return cooked.cooked;
    }
  }
  return null;
}

/**
 * Get a callee name from a CallExpression node.
 */
export function getCalleeName(node: ASTNode): string | null {
  const callee = node.callee as ASTNode | undefined;
  if (!callee) return null;

  if (callee.type === 'Identifier') {
    return callee.name as string;
  }

  if (callee.type === 'MemberExpression') {
    const obj = callee.object as ASTNode | undefined;
    const prop = callee.property as ASTNode | undefined;
    if (obj && prop) {
      const objName = obj.name as string | undefined;
      const propName = prop.name as string | undefined;
      if (objName && propName) return `${objName}.${propName}`;
    }
  }

  return null;
}

/**
 * Check whether a node represents a function of any kind.
 */
export function isFunctionNode(node: ASTNode): boolean {
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  );
}

/**
 * Count the number of statements inside a function body.
 */
export function countFunctionLines(node: ASTNode): number {
  if (!node.loc) return 0;
  return node.loc.end.line - node.loc.start.line + 1;
}

/**
 * Calculate cyclomatic complexity of a function node.
 * Counts: if, else if, case, ternary, &&, ||, ??, for, while, do, catch.
 */
export function cyclomaticComplexity(funcNode: ASTNode): number {
  let complexity = 1;

  traverse(funcNode, {
    IfStatement() {
      complexity++;
    },
    SwitchCase(node) {
      if (node.test !== null) complexity++;
    },
    ConditionalExpression() {
      complexity++;
    },
    LogicalExpression(node) {
      if (node.operator === '&&' || node.operator === '||' || node.operator === '??') {
        complexity++;
      }
    },
    ForStatement() {
      complexity++;
    },
    ForInStatement() {
      complexity++;
    },
    ForOfStatement() {
      complexity++;
    },
    WhileStatement() {
      complexity++;
    },
    DoWhileStatement() {
      complexity++;
    },
    CatchClause() {
      complexity++;
    },
  });

  return complexity;
}

/**
 * Get the maximum nesting depth of a function body.
 */
export function maxNestingDepth(ast: unknown, startDepth = 0): number {
  if (!ast || typeof ast !== 'object') return startDepth;
  const node = ast as ASTNode;

  const nestingTypes = new Set([
    'IfStatement',
    'ForStatement',
    'ForInStatement',
    'ForOfStatement',
    'WhileStatement',
    'DoWhileStatement',
    'SwitchStatement',
    'TryStatement',
    'WithStatement',
  ]);

  let max = startDepth;

  const walk = (n: unknown, depth: number): void => {
    if (!n || typeof n !== 'object') return;
    const nn = n as ASTNode;

    const currentDepth = nestingTypes.has(nn.type) ? depth + 1 : depth;
    if (currentDepth > max) max = currentDepth;

    for (const key of Object.keys(nn)) {
      if (key === 'parent') continue;
      const child = nn[key];
      if (Array.isArray(child)) {
        for (const item of child) walk(item, currentDepth);
      } else if (child && typeof child === 'object' && 'type' in (child as object)) {
        walk(child, currentDepth);
      }
    }
  };

  walk(node, startDepth);
  return max;
}
