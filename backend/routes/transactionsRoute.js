import express from "express";
import {sql} from "../config/db.js";
import {getTransactionByUserId, createTransaction, deleteTransaction, getSymmaryByUserId} from "../controllers/transactionsController.js";

const router = express.Router()

router.get("/:userId", getTransactionByUserId );

// Add a new transaction
router.post("/", createTransaction);

// Delete a transaction
router.delete("/:id", deleteTransaction);

// Get transaction summary for a user
router.get("/summary/:userId", getSymmaryByUserId);


export default router