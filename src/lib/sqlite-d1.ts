import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

let instance: any = null;

export function getLocalD1Database() {
  if (instance) return instance;

  const dataDir = path.join(process.cwd(), '.data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'd1_local.sqlite');
  const rawDb = new DatabaseSync(dbPath);

  // Enable WAL mode and foreign keys for high performance and durability
  try {
    rawDb.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");
  } catch (e) {}

  const wrapPreparedStatement = (sql: string, boundArgs: any[] = []) => {
    return {
      bind(...newArgs: any[]) {
        return wrapPreparedStatement(sql, newArgs);
      },
      async all(...overrideArgs: any[]) {
        const args = overrideArgs.length > 0 ? overrideArgs : boundArgs;
        const stmt = rawDb.prepare(sql);
        const rows = stmt.all(...args);
        return { results: rows };
      },
      async first(...overrideArgs: any[]) {
        const args = overrideArgs.length > 0 ? overrideArgs : boundArgs;
        const stmt = rawDb.prepare(sql);
        return stmt.get(...args) || null;
      },
      async get(...overrideArgs: any[]) {
        const args = overrideArgs.length > 0 ? overrideArgs : boundArgs;
        const stmt = rawDb.prepare(sql);
        return stmt.get(...args) || null;
      },
      async run(...overrideArgs: any[]) {
        const args = overrideArgs.length > 0 ? overrideArgs : boundArgs;
        const stmt = rawDb.prepare(sql);
        return stmt.run(...args);
      },
      _rawSql: sql,
      _boundArgs: boundArgs
    };
  };

  instance = {
    prepare(sql: string) {
      return wrapPreparedStatement(sql);
    },
    async batch(statements: any[]) {
      rawDb.exec("BEGIN TRANSACTION");
      try {
        const results = [];
        for (const stmt of statements) {
          const sql = stmt._rawSql;
          const args = stmt._boundArgs || [];
          const prepared = rawDb.prepare(sql);
          results.push(prepared.run(...args));
        }
        rawDb.exec("COMMIT");
        return results;
      } catch (err) {
        rawDb.exec("ROLLBACK");
        throw err;
      }
    },
    exec(sql: string) {
      return rawDb.exec(sql);
    },
    raw: rawDb
  };

  return instance;
}
