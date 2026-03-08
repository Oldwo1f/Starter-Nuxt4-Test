/**
 * Load .env from project root.
 * - When running from backend/: loads ../.env
 * - When running from project root: loads .env
 */
import dotenv from 'dotenv';
import path from 'path';

const cwd = process.cwd();
const rootEnv =
  path.basename(cwd) === 'backend'
    ? path.resolve(cwd, '..', '.env')
    : path.resolve(cwd, '.env');
dotenv.config({ path: rootEnv });
