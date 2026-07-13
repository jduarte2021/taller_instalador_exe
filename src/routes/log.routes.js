import { Router } from "express";
import { getLogs } from "../controllers/log.controller.js";
import { authRequired } from "../middlewares/validateTokens.js";

const router = Router();
router.get('/logs', authRequired, getLogs);
export default router;
