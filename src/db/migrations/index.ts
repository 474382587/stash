import type { SQLiteDatabase } from "expo-sqlite";

import { up as v1 } from "src/db/migrations/v1-initial";

interface Migration {
  up: (db: SQLiteDatabase) => Promise<void>;
  version: number;
}

const migrations: Migration[] = [
  { up: v1, version: 1 },
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version"
  );
  const currentVersion = result?.user_version ?? 0;

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      await db.withTransactionAsync(async () => {
        await migration.up(db);
        await db.execAsync(`PRAGMA user_version = ${migration.version}`);
      });
    }
  }
}
