import type { ScanResult } from '../types.js';

export function generateJsonReport(result: ScanResult): string {
  return JSON.stringify(result, null, 2);
}
