import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

/**
 * Global setup runs once before any worker starts.
 *
 * User registration and authentication are now handled per-worker by the
 * `workerUser` fixture in fixtures/index.ts, so there is no shared user to
 * create here. The only job left is to ensure the .auth directory exists so
 * worker session files can be written to it without a race condition.
 */
async function globalSetup() {
  fs.mkdirSync(path.join(process.cwd(), '.auth'), { recursive: true });
}

export default globalSetup;
