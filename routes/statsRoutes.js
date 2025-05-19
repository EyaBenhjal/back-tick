import express from "express";
import { getTicketStats, getMonthlyTrends } from "../controllers/statsController";
import authMiddleware from "../middlewares/auth"; // Middleware d'authentification

const router = express.Router();

router.get("/stats", authMiddleware, getTicketStats);
router.get("/stats/trends", authMiddleware, getMonthlyTrends);

export default router;