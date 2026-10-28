/**
 * D1 Database Resolver
 * Enforces explicit adapter separation:
 * 1. Cloudflare Pages / Workers: requires context.env.DB.
 *    If deployed to Cloudflare and env.DB is not provided, FAILS SAFELY with HTTP 500.
 *    NEVER silently falls back to local sqlite or alternative stores in production!
 * 2. Node Production:
 *    Local SQLite fallback is STRICTLY PROHIBITED in production under all conditions.
 *    Throws D1BindingError if binding is not provided.
 * 3. Local Node Development / Tests:
 *    Only allowed when NODE_ENV is explicitly 'development' or 'test', or ALLOW_LOCAL_SQLITE='true'.
 *    Any unconfigured environment fails fast with D1ConfigurationError.
 */

export class D1BindingError extends Error {
  statusCode: number;
  constructor(message = 'Cloudflare D1 binding (env.DB) is not configured.') {
    super(message);
    this.name = 'D1BindingError';
    this.statusCode = 500;
  }
}

export class D1ConfigurationError extends Error {
  statusCode: number;
  constructor(message = 'Database configuration error: invalid or unpermitted database adapter.') {
    super(message);
    this.name = 'D1ConfigurationError';
    this.statusCode = 500;
  }
}

/**
 * Detects whether the current execution context is Cloudflare runtime or Node.js.
 */
export function detectRuntime(contextOrReq?: any, explicitEnv?: any): 'cloudflare' | 'node' {
  if (contextOrReq?.isCloudflare === true) return 'cloudflare';
  if (contextOrReq && contextOrReq.request && contextOrReq.env !== undefined) return 'cloudflare';
  if (explicitEnv !== undefined && explicitEnv !== null && typeof explicitEnv === 'object' && 'DB' in explicitEnv) return 'cloudflare';
  
  if (typeof (globalThis as any).WebSocketPair !== 'undefined') return 'cloudflare';
  if (typeof (globalThis as any).navigator?.userAgent === 'string' && 
      (globalThis as any).navigator?.userAgent.includes('Cloudflare-Workers')) {
    return 'cloudflare';
  }
  if (typeof process === 'undefined' || !process.versions?.node) {
    return 'cloudflare';
  }

  return 'node';
}

/**
 * Lazily loads the local SQLite adapter ONLY when executing in a Node development or test environment.
 * Evaluates dynamically to prevent Cloudflare Pages / Workers bundlers (esbuild/wrangler)
 * from statically tracing Node built-ins (node:sqlite, path, fs).
 */
function getLocalD1Database(): any {
  try {
    let nodeRequire: any = null;

    if (typeof process !== 'undefined' && typeof (process as any).getBuiltinModule === 'function') {
      try {
        const mod = (process as any).getBuiltinModule('module');
        if (mod && typeof mod.createRequire === 'function') {
          nodeRequire = mod.createRequire((process.cwd ? process.cwd() : '.') + '/package.json');
        }
      } catch {}
    }

    if (!nodeRequire) {
      try {
        nodeRequire = (0, eval)('typeof require !== "undefined" ? require : null');
      } catch {}
    }

    if (!nodeRequire && typeof module !== 'undefined' && (module as any).require) {
      nodeRequire = (module as any).require.bind(module);
    }

    if (nodeRequire) {
      const candidates = [
        './src/lib/sqlite-d1',
        './sqlite-d1',
        typeof __dirname !== 'undefined' ? `${__dirname}/sqlite-d1` : null,
        typeof __dirname !== 'undefined' ? `${__dirname}/src/lib/sqlite-d1` : null,
        typeof process !== 'undefined' && process.cwd ? `${process.cwd()}/src/lib/sqlite-d1` : null
      ].filter(Boolean) as string[];

      for (const candidate of candidates) {
        try {
          const mod = nodeRequire(candidate);
          if (mod && typeof mod.getLocalD1Database === 'function') {
            return mod.getLocalD1Database();
          }
        } catch {}
      }
    }
  } catch (err: any) {
    throw new D1ConfigurationError(`Failed to load local SQLite adapter: ${err?.message || err}`);
  }

  throw new D1ConfigurationError(
    'Local SQLite adapter could not be loaded. Please ensure "sqlite-d1.ts" is present and node:sqlite is supported.'
  );
}

/**
 * Resolves the active D1 database handle.
 * @param contextOrReq Either a Cloudflare Pages context ({ request, env }) or Express Request.
 * @param explicitEnv Optional explicit env object.
 */
export function resolvePeopleD1(contextOrReq?: any, explicitEnv?: any): any {
  const env = contextOrReq?.env || explicitEnv;

  // 1. Direct Cloudflare Pages env binding
  if (env?.DB) {
    return env.DB;
  }

  // 2. Custom attached db instance (e.g. for isolated test suites)
  if (contextOrReq?.d1Db) {
    return contextOrReq.d1Db;
  }

  const runtime = detectRuntime(contextOrReq, explicitEnv);

  // 3. Runtime Cloudflare Pages / Workers:
  if (runtime === 'cloudflare') {
    // In Cloudflare runtime, missing env.DB is a fatal configuration error.
    // Silent fallback to local SQLite is strictly prohibited.
    throw new D1BindingError('Cloudflare D1 binding (env.DB) is not configured in this environment.');
  }

  // 4. Runtime Node.js:
  // In production mode, local SQLite fallback is STRICTLY PROHIBITED regardless of any other flags.
  if (process.env.NODE_ENV === 'production') {
    throw new D1BindingError('Node production environment cannot use local SQLite fallback. A valid Cloudflare D1 binding (env.DB) is required.');
  }

  // Only permit local SQLite if explicitly running in development or test, or ALLOW_LOCAL_SQLITE is set.
  const isExplicitDevOrTest = process.env.NODE_ENV === 'development' || 
                              process.env.NODE_ENV === 'test' || 
                              process.env.ALLOW_LOCAL_SQLITE === 'true';

  if (!isExplicitDevOrTest) {
    throw new D1ConfigurationError(
      `Local SQLite fallback is disabled. Local SQLite is only permitted when NODE_ENV is explicitly set to "development" or "test", or when ALLOW_LOCAL_SQLITE="true". Current NODE_ENV: "${process.env.NODE_ENV || 'undefined'}". Cloudflare D1 binding (env.DB) is required.`
    );
  }

  // 5. Local development & test runner adapter
  return getLocalD1Database();
}
