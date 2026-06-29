/**
 * Test fixture: deliberately contains violations for integration testing.
 * This file is not production code.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */

// FIXME: this whole module needs a rewrite
// TODO: add proper error handling

import { exec } from 'child_process';

// Hardcoded secret
const API_KEY = 'AKIAIOSFODNN7EXAMPLE12345';
const DB_PASSWORD = 'password123';
const JWT_SECRET = 'super-secret-jwt-signing-key-12345';

// Debug flag
const debug = true;

// Localhost URL
const BASE_URL = 'http://localhost:3000/api';

// Fake validation
function validateUser(_user: unknown): boolean {
  return true;
}

// Empty catch block
function loadConfig() {
  try {
    return JSON.parse('{}');
  } catch (e) {
    // silently swallowed
  }
}

// Console debug
function processRequest(req: { body: unknown; params: { id: string } }) {
  console.log('Processing request:', req.body);
  console.debug('Request params:', req.params);

  // SQL injection
  const userId = req.params.id;
  const query = `SELECT * FROM users WHERE id = ${userId}`;

  // Unsafe eval
  eval(query);

  // Math.random for security token
  const token = Math.random().toString(36).slice(2);

  // Unhandled promise
  fetch(`${BASE_URL}/notify`);

  return token;
}

// Dead code
function calculateTotal(items: number[]) {
  const total = items.reduce((a, b) => a + b, 0);
  return total;
  console.log('Never reached');
}

// Giant function (fake - just to demonstrate the concept)
function monolithicHandler(
  _req: Record<string, unknown>,
  _res: Record<string, unknown>,
) {
  // Placeholder
  throw new Error('Not implemented');
}

// Command injection
function runUserScript(userInput: string) {
  exec(`node ${userInput}`);
}

export {
  validateUser,
  loadConfig,
  processRequest,
  calculateTotal,
  monolithicHandler,
  runUserScript,
};
