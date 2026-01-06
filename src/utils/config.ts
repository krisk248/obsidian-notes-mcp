/**
 * Configuration management for obsidian-mcp
 *
 * Loads configuration from environment variables with sensible defaults.
 */

import type { ObsidianConfig } from '../types/index.js';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 27124;
const DEFAULT_PROTOCOL = 'https';

/**
 * Load configuration from environment variables
 */
export function loadConfig(): ObsidianConfig {
  const apiKey = process.env.OBSIDIAN_API_KEY;

  if (!apiKey) {
    throw new Error(
      'OBSIDIAN_API_KEY environment variable is required.\n' +
      'Get your API key from Obsidian: Settings → Local REST API → Copy API Key\n' +
      'Then set it: export OBSIDIAN_API_KEY="your_key_here"'
    );
  }

  const host = process.env.OBSIDIAN_HOST || DEFAULT_HOST;
  const port = parseInt(process.env.OBSIDIAN_PORT || String(DEFAULT_PORT), 10);
  const protocol = (process.env.OBSIDIAN_PROTOCOL || DEFAULT_PROTOCOL) as 'http' | 'https';

  // Allow disabling certificate verification for self-signed certs
  const rejectUnauthorized = process.env.OBSIDIAN_REJECT_UNAUTHORIZED !== 'false';

  return {
    apiKey,
    host,
    port,
    protocol,
    rejectUnauthorized,
  };
}

/**
 * Get the base URL for the Obsidian REST API
 */
export function getBaseUrl(config: ObsidianConfig): string {
  return `${config.protocol}://${config.host}:${config.port}`;
}

/**
 * Validate configuration
 */
export function validateConfig(config: ObsidianConfig): string[] {
  const errors: string[] = [];

  if (!config.apiKey) {
    errors.push('API key is required');
  }

  if (config.port < 1 || config.port > 65535) {
    errors.push('Port must be between 1 and 65535');
  }

  if (!['http', 'https'].includes(config.protocol)) {
    errors.push('Protocol must be http or https');
  }

  return errors;
}
