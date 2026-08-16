import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { resetD1TablesEnsuredCache } from '../services/d1MigrationService';

let instance: any = null;

function isCorruptError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || err).toLowerCase();
  return msg.includes('malformed') || msg.includes('corrupt') || err.code === 'ERR_SQLITE_ERROR';
}

function cleanCorruptDatabaseFiles() {
  const dataDir = path.join(process.cwd(), '.data');
  const files = ['d1_local.sqlite', 'd1_local.sqlite-wal', 'd1_local.sqlite-shm'];
  for (const f of files) {
    const fullPath = path.join(dataDir, f);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (e) {
        console.error(`Failed to remove corrupt database file ${fullPath}:`, e);
      }
    }
  }
}

export function resetLocalD1Database() {
  instance = null;
  resetD1TablesEnsuredCache();
  cleanCorruptDatabaseFiles();
}

export function getLocalD1Database() {
  if (instance) return instance;

  const dataDir = path.join(process.cwd(), '.data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'd1_local.sqlite');
  let rawDb: any = null;

  try {
    rawDb = new DatabaseSync(dbPath);
    rawDb.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");
    // Quick test to verify database integrity
    rawDb.prepare("PRAGMA quick_check;").get();
  } catch (err) {
    console.error("[sqlite-d1] Detected corrupted database file, resetting SQLite DB...", err);
    resetLocalD1Database();
    rawDb = new DatabaseSync(dbPath);
    try {
      rawDb.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");
    } catch (e) {}
  }

  const handleOp = async <T>(fn: () => T): Promise<T> => {
    try {
      return fn();
    } catch (err: any) {
      if (isCorruptError(err)) {
        console.error("[sqlite-d1] Query failed due to DB corruption. Auto-recovering...", err);
        resetLocalD1Database();
        const freshDb = getLocalD1Database();
        return fn();
      }
      throw err;
    }
  };

  const wrapPreparedStatement = (sql: string, boundArgs: any[] = []) => {
    return {
      bind(...newArgs: any[]) {
        return wrapPreparedStatement(sql, newArgs);
      },
      async all(...overrideArgs: any[]) {
        return handleOp(() => {
          const args = overrideArgs.length > 0 ? overrideArgs : boundArgs;
          const stmt = rawDb.prepare(sql);
          const rows = stmt.all(...args);
          return { results: rows };
        });
      },
      async first(...overrideArgs: any[]) {
        return handleOp(() => {
          const args = overrideArgs.length > 0 ? overrideArgs : boundArgs;
          const stmt = rawDb.prepare(sql);
          return stmt.get(...args) || null;
        });
      },
      async get(...overrideArgs: any[]) {
        return handleOp(() => {
          const args = overrideArgs.length > 0 ? overrideArgs : boundArgs;
          const stmt = rawDb.prepare(sql);
          return stmt.get(...args) || null;
        });
      },
      async run(...overrideArgs: any[]) {
        return handleOp(() => {
          const args = overrideArgs.length > 0 ? overrideArgs : boundArgs;
          const stmt = rawDb.prepare(sql);
          return stmt.run(...args);
        });
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
      return handleOp(() => {
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
      });
    },
    exec(sql: string) {
      try {
        return rawDb.exec(sql);
      } catch (err) {
        if (isCorruptError(err)) {
          resetLocalD1Database();
          return getLocalD1Database().exec(sql);
        }
        throw err;
      }
    },
    raw: rawDb
  };

  return instance;
}
