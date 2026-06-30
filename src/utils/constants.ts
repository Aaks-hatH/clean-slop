export const DOCS_BASE_URL = 'https://clean-slop.dev/docs';
export const PACKAGE_NAME = 'clean-slop';

export const SEVERITY_ORDER: Record<string, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

export const SEVERITY_COLORS: Record<string, string> = {
  critical: '\x1b[31m', // red
  high: '\x1b[91m', // bright red
  medium: '\x1b[33m', // yellow
  low: '\x1b[36m', // cyan
  info: '\x1b[37m', // gray
};

export const RESET = '\x1b[0m';
export const BOLD = '\x1b[1m';
export const DIM = '\x1b[2m';
export const GREEN = '\x1b[32m';
export const YELLOW = '\x1b[33m';
export const RED = '\x1b[31m';
export const CYAN = '\x1b[36m';
export const GRAY = '\x1b[90m';
