import express from "express";
import {
	createTransaction,
	deleteTransaction,
	getSymmaryByUserId,
	getTransactionByUserId,
	getTransactionHistory,
	restoreTransaction,
	updateTransaction,
} from "../controllers/transactionsController.js";

const router = express.Router()

router.get("/history/:userId", getTransactionHistory);
router.get("/summary/:userId", getSymmaryByUserId);
router.get("/:userId", getTransactionByUserId);

// Add a new transaction
router.post("/", createTransaction);
router.patch("/:id", updateTransaction);
router.post("/:id/restore/:historyId", restoreTransaction);

// Delete a transaction
router.delete("/:id", deleteTransaction);


export default router