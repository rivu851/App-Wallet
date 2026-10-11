import {sql} from "../config/db.js";

const validSources = new Set(["own", "father"]);

async function saveHistory(transaction, action) {
  const [history] = await sql`
    INSERT INTO transaction_history (transaction_id, user_id, action, snapshot)
    VALUES (${transaction.id}, ${transaction.user_id}, ${action}, ${JSON.stringify(transaction)}::jsonb)
    RETURNING id
  `;
  return history;
}

export async function getTransactionByUserId(req, res){
  try {
    const { userId } = req.params;
    const transactions = await sql`
      SELECT * FROM transactions
      WHERE user_id = ${userId} AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    res.status(200).json(transactions);
  } catch (error) {
    console.error("Error getting transactions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function createTransaction(req,res){
  try {
    const { title, amount, category, user_id, source = "own", client_id = null } = req.body;
    const numericAmount = Number(amount);

    if (!title?.trim() || !user_id || !category || !Number.isFinite(numericAmount) || numericAmount === 0) {
      return res.status(400).json({ message: "Title, amount, category, and user_id are required" });
    }
    if (!validSources.has(source) || (source === "father" && numericAmount > 0)) {
      return res.status(400).json({ message: "Father's money can only be recorded as spending" });
    }

    const transaction = await sql`
      INSERT INTO transactions (user_id, title, amount, category, source, client_id)
      VALUES (${user_id}, ${title.trim()}, ${numericAmount}, ${category}, ${source}, ${client_id})
      ON CONFLICT (user_id, client_id) WHERE client_id IS NOT NULL DO UPDATE SET client_id = EXCLUDED.client_id
      RETURNING *
    `;

    res.status(201).json(transaction[0]);
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateTransaction(req, res) {
  try {
    const { id } = req.params;
    const { user_id, title, amount, category, source } = req.body;
    const numericAmount = Number(amount);

    if (!user_id || !title?.trim() || !category || !Number.isFinite(numericAmount) || numericAmount === 0) {
      return res.status(400).json({ message: "Title, amount, category, and user_id are required" });
    }
    if (!validSources.has(source) || (source === "father" && numericAmount > 0)) {
      return res.status(400).json({ message: "Father's money can only be recorded as spending" });
    }

    const existing = await sql`SELECT * FROM transactions WHERE id = ${id} AND user_id = ${user_id} AND deleted_at IS NULL`;
    if (!existing.length) return res.status(404).json({ message: "Transaction not found" });

    await saveHistory(existing[0], "updated");
    const updated = await sql`
      UPDATE transactions
      SET title = ${title.trim()}, amount = ${numericAmount}, category = ${category}, source = ${source}, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user_id}
      RETURNING *
    `;
    res.status(200).json(updated[0]);
  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteTransaction(req, res) {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ message: "user_id is required" });

    const existing = await sql`SELECT * FROM transactions WHERE id = ${id} AND user_id = ${user_id} AND deleted_at IS NULL`;
    if (!existing.length) return res.status(404).json({ message: "Transaction not found" });

    const history = await saveHistory(existing[0], "deleted");
    await sql`UPDATE transactions SET deleted_at = NOW(), updated_at = NOW() WHERE id = ${id} AND user_id = ${user_id}`;
    res.status(200).json({ message: "Transaction deleted successfully", history_id: history.id });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function restoreTransaction(req, res) {
  try {
    const { id, historyId } = req.params;
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ message: "user_id is required" });

    const previous = await sql`
      SELECT snapshot FROM transaction_history
      WHERE id = ${historyId} AND transaction_id = ${id} AND user_id = ${user_id}
    `;
    if (!previous.length) return res.status(404).json({ message: "History entry not found" });

    const current = await sql`SELECT * FROM transactions WHERE id = ${id} AND user_id = ${user_id}`;
    if (!current.length) return res.status(404).json({ message: "Transaction not found" });
    await saveHistory(current[0], "restored");

    const snapshot = previous[0].snapshot;
    const restored = await sql`
      UPDATE transactions
      SET title = ${snapshot.title}, amount = ${snapshot.amount}, category = ${snapshot.category},
          source = ${snapshot.source || "own"}, created_at = ${snapshot.created_at},
          deleted_at = ${snapshot.deleted_at || null}, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user_id}
      RETURNING *
    `;
    res.status(200).json(restored[0]);
  } catch (error) {
    console.error("Error restoring transaction:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getTransactionHistory(req, res) {
  try {
    const { userId } = req.params;
    const history = await sql`
      SELECT id, transaction_id, action, snapshot, created_at
      FROM transaction_history
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    res.status(200).json(history);
  } catch (error) {
    console.error("Error getting transaction history:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getSymmaryByUserId(req, res) {
  try {
    const { userId } = req.params;
    const [summary] = await sql`
      SELECT
        COALESCE(SUM(amount), 0) AS balance,
        COALESCE(SUM(amount) FILTER (WHERE source = 'own' AND amount > 0), 0) AS income,
        COALESCE(SUM(amount) FILTER (WHERE amount < 0), 0) AS expenses,
        COALESCE(SUM(amount) FILTER (WHERE source = 'own'), 0) AS own_balance,
        COALESCE(SUM(amount) FILTER (WHERE source = 'own' AND amount > 0), 0) AS own_income,
        COALESCE(-SUM(amount) FILTER (WHERE source = 'own' AND amount < 0), 0) AS own_expenses,
        COALESCE(-SUM(amount) FILTER (WHERE source = 'father' AND amount < 0), 0) AS father_spending,
        COALESCE(-SUM(amount) FILTER (WHERE amount < 0 AND created_at::date = CURRENT_DATE), 0) AS daily_spending,
        COALESCE(-SUM(amount) FILTER (WHERE amount < 0 AND created_at::date >= CURRENT_DATE - INTERVAL '6 days'), 0) AS weekly_spending,
        COALESCE(-SUM(amount) FILTER (WHERE amount < 0 AND date_trunc('month', created_at) = date_trunc('month', NOW())), 0) AS monthly_spending,
        COALESCE(-SUM(amount) FILTER (WHERE source = 'own' AND amount < 0 AND created_at::date = CURRENT_DATE), 0) AS own_daily_spending,
        COALESCE(-SUM(amount) FILTER (WHERE source = 'own' AND amount < 0 AND created_at::date >= CURRENT_DATE - INTERVAL '6 days'), 0) AS own_weekly_spending,
        COALESCE(-SUM(amount) FILTER (WHERE source = 'own' AND amount < 0 AND date_trunc('month', created_at) = date_trunc('month', NOW())), 0) AS own_monthly_spending,
        COALESCE(-SUM(amount) FILTER (WHERE source = 'father' AND amount < 0 AND created_at::date = CURRENT_DATE), 0) AS father_daily_spending,
        COALESCE(-SUM(amount) FILTER (WHERE source = 'father' AND amount < 0 AND created_at::date >= CURRENT_DATE - INTERVAL '6 days'), 0) AS father_weekly_spending,
        COALESCE(-SUM(amount) FILTER (WHERE source = 'father' AND amount < 0 AND date_trunc('month', created_at) = date_trunc('month', NOW())), 0) AS father_monthly_spending
      FROM transactions
      WHERE user_id = ${userId} AND deleted_at IS NULL
    `;
    res.status(200).json(summary);
  } catch (error) {
    console.error("Error getting the summary:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
