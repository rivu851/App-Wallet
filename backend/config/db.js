import { neon } from "@neondatabase/serverless";
import "dotenv/config";

// Create a SQL connection to the Neon DB
export const sql = neon(process.env.DATABASE_URL);

export async function initDB() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        category VARCHAR(255) NOT NULL,
        created_at DATE NOT NULL DEFAULT CURRENT_DATE
      )
    `;
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'own'`;
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS client_id VARCHAR(100)`;
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`;
    await sql`ALTER TABLE transactions ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at::timestamp AT TIME ZONE 'UTC'`;
    await sql`ALTER TABLE transactions ALTER COLUMN created_at SET DEFAULT NOW()`;
    await sql`
      CREATE TABLE IF NOT EXISTS transaction_history (
        id SERIAL PRIMARY KEY,
        transaction_id INTEGER NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        action VARCHAR(20) NOT NULL,
        snapshot JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS transaction_history_user_created_idx ON transaction_history (user_id, created_at DESC)`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_client_id_idx ON transactions (user_id, client_id) WHERE client_id IS NOT NULL`;
    console.log("✅ Database initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing DB:", error);
    process.exit(1);
  }
}