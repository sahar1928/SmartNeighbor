import pg from "pg";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const { Pool } = pg;
const rootDir = fileURLToPath(new URL("..", import.meta.url));
const databaseDir = join(rootDir, "database");
const databaseUrl = process.env.DATABASE_URL ?? "";
const useSsl = process.env.DATABASE_SSL === "true";
const databaseMode = process.env.DATABASE_MODE ?? "memory";

export const dbEnabled = Boolean(databaseUrl) && databaseMode === "postgres";

export const pool = dbEnabled
  ? new Pool({
      connectionString: databaseUrl,
      ssl: useSsl ? { rejectUnauthorized: false } : false
    })
  : null;

let migrationPromise = null;

export async function query(text, params = []) {
  if (!pool) throw new Error("DATABASE_URL is not configured");
  await ensureDatabase();
  return pool.query(text, params);
}

export async function transaction(callback) {
  if (!pool) throw new Error("DATABASE_URL is not configured");
  await ensureDatabase();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function ensureDatabase() {
  if (!pool) return;
  if (!migrationPromise) migrationPromise = migrate();
  await migrationPromise;
}

async function migrate() {
  await bootstrapSchema();
  await seedDatabaseIfEmpty();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query("ALTER TABLE residents ADD COLUMN IF NOT EXISTS access_token_hash TEXT");
  await pool.query("ALTER TABLE residents ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ");
  await pool.query("ALTER TABLE residents ADD COLUMN IF NOT EXISTS token_rotated_at TIMESTAMPTZ");
  await pool.query("ALTER TABLE residents ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false");
  await pool.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_reference TEXT");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS resident_charges (
      id TEXT PRIMARY KEY,
      building_id TEXT NOT NULL REFERENCES buildings(id),
      resident_id TEXT NOT NULL REFERENCES residents(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('open', 'paid', 'void')),
      due_date DATE NOT NULL,
      category TEXT NOT NULL,
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS resident_ledger (
      id TEXT PRIMARY KEY,
      resident_id TEXT NOT NULL REFERENCES residents(id),
      type TEXT NOT NULL CHECK (type IN ('charge', 'payment', 'adjustment')),
      title TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      provider_reference TEXT,
      posted_at DATE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    UPDATE residents
    SET access_token_hash = CASE id
      WHEN 'res-1' THEN '9388541163130c8806b72ce24499dcb207b7add5086733fe94ebd54b6689318e'
      WHEN 'res-2' THEN 'b13eb94f039c0ff05cb61c8c02382f8de204803c4491551fe8a92352d3da3399'
      WHEN 'res-3' THEN 'ff42c15780678723a45548704a78ee417d52c3643ebe2d9791c7122c32f54ecb'
      WHEN 'res-4' THEN 'c44b77ad87444bee4662906da01d2e62f2aef91fd3ee4cede9c09e966a9f1b8b'
      ELSE access_token_hash
    END
    WHERE access_token_hash IS NULL
       OR access_token_hash IN ('demo-danny-4b', 'demo-sarah-4', 'demo-yossi-11', 'demo-michal-1a')
  `);

  const chargeCount = await pool.query("SELECT count(*)::int AS count FROM resident_charges");
  if (chargeCount.rows[0].count === 0) {
    await pool.query(`
      INSERT INTO resident_charges (id, building_id, resident_id, title, description, amount_cents, status, due_date, category)
      VALUES
        ('chg-1', 'bldg-rtl-24', 'res-1', 'ועד בית מאי 2026', 'דמי ועד חודשיים לדירה 4ב', 35000, 'open', '2026-05-10', 'monthly_fee'),
        ('chg-2', 'bldg-rtl-24', 'res-1', 'השתתפות תיקון מעלית', 'חלוקת עלות תיקון חירום במעלית', 12000, 'open', '2026-06-01', 'maintenance'),
        ('chg-3', 'bldg-rtl-24', 'res-2', 'ועד בית מאי 2026', 'דמי ועד חודשיים לדירה 4', 35000, 'paid', '2026-05-10', 'monthly_fee')
      ON CONFLICT (id) DO NOTHING
    `);
  }

  const ledgerCount = await pool.query("SELECT count(*)::int AS count FROM resident_ledger");
  if (ledgerCount.rows[0].count === 0) {
    await pool.query(`
      INSERT INTO resident_ledger (id, resident_id, type, title, amount_cents, posted_at)
      VALUES
        ('led-1', 'res-1', 'charge', 'ועד בית מאי 2026', 35000, '2026-05-01'),
        ('led-2', 'res-1', 'charge', 'השתתפות תיקון מעלית', 12000, '2026-05-22'),
        ('led-3', 'res-2', 'charge', 'ועד בית מאי 2026', 35000, '2026-05-01'),
        ('led-4', 'res-2', 'payment', 'תשלום Bit', -35000, '2026-05-03')
      ON CONFLICT (id) DO NOTHING
    `);
  }

  await pool.query("CREATE INDEX IF NOT EXISTS idx_residents_access_token_hash ON residents(access_token_hash)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_payments_resident_status ON payments(resident_id, status)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_charges_resident_status ON resident_charges(resident_id, status)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_ledger_resident_posted ON resident_ledger(resident_id, posted_at DESC)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at DESC)");
}

async function bootstrapSchema() {
  const schemaPath = join(databaseDir, "schema.sql");
  const schemaSql = await readFile(schemaPath, "utf8");
  const idempotentSchema = schemaSql.replaceAll("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS ");
  await pool.query(idempotentSchema);
}

async function seedDatabaseIfEmpty() {
  const count = await pool.query("SELECT count(*)::int AS count FROM buildings");
  if (count.rows[0].count > 0) return;

  const seedPath = join(databaseDir, "seed.sql");
  const seedSql = await readFile(seedPath, "utf8");
  await pool.query(seedSql);
}
