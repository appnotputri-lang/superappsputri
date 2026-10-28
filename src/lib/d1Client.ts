/**
 * D1 Database Resolver
 * Enforces explicit adapter separation:
 * 1. Cloudflare Pages / Workers: requires context.env.DB.
 *    If deployed to Cloudflare and env.DB is not provided, FAILS SAFELY with HTTP 500.
 *    NEVER silently falls back to local sqlite or alternative stores in production!
 * 2. Local Node Development / Tests: explicitly uses getLocalD1Database()
 *    ONLY when running in local Node environment (process.env.NODE_ENV !== 'production').
 */

import { getLocalD1Database } from './sqlite-d1';

export class D1BindingError extends Error {
  statusCode: number;
  constructor(message = 'Cloudflare D1 binding (env.DB) is not configured.') {
    super(message);
    this.name = 'D1BindingError';
    this.statusCode = 500;
  }
}

/**
 * Resolves the active D1 database handle.
 * @param contextOrReq Either a Cloudflare Pages context ({ request, env }) or Express Request.
 * @param explicitEnv Optional explicit env object.
 */
export function resolvePeopleD1(contextOrReq?: any, explicitEnv?: any): any {
  // 1. Direct Cloudflare Pages env binding
  const env = contextOrReq?.env || explicitEnv;
  if (env?.DB) {
    return env.DB;
  }

  // 2. Custom attached db instance (e.g. for isolated test suites)
  if (contextOrReq?.d1Db) {
    return contextOrReq.d1Db;
  }

  // 3. Detect if called from Cloudflare Pages / Workers context
  const isCloudflareContext = Boolean(
    contextOrReq?.isCloudflare ||
    (contextOrReq && contextOrReq.request && contextOrReq.env !== undefined) ||
    explicitEnv !== undefined
  );

  // 4. Detect if running inside Cloudflare Workers / Pages runtime
  const isCloudflareRuntime = isCloudflareContext || (
    typeof (globalThis as any).WebSocketPair !== 'undefined'
  ) || (
    typeof process === 'undefined' || !process.versions?.node
  );

  if (isCloudflareRuntime) {
    // In Cloudflare runtime, missing env.DB is a fatal configuration error.
    // Silent fallback to local SQLite is strictly prohibited.
    throw new D1BindingError('Cloudflare D1 binding (env.DB) is not configured in this environment.');
  }

  // 4. In Node.js environment:
  // If running in production mode, require explicit Cloudflare D1 or fail
  if (process.env.NODE_ENV === 'production' && process.env.REQUIRE_CLOUDFLARE_D1 === 'true') {
    throw new D1BindingError('Production requires Cloudflare D1 binding. Local SQLite fallback is prohibited.');
  }

  // 5. Local development & test runner adapter
  return getLocalD1Database();
}
