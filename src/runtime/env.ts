export function getEnv(env: any, key: string, fallback = ''): string {
  if (env && typeof env === 'object' && key in env && env[key] !== undefined && env[key] !== null) {
    return String(env[key]);
  }
  if (typeof process !== 'undefined' && process.env && process.env[key] !== undefined && process.env[key] !== null) {
    return String(process.env[key]);
  }
  return fallback;
}
