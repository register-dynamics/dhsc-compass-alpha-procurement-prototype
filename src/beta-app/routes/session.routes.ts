import { Router } from "express";

import { renderSignIn } from "../controllers/session.controller.js";

const router = Router();

router.get("/sign-in", renderSignIn);
router.post("/sign-in", () => { throw new Error("Function not implemented."); });

router.get("/sign-out", () => { throw new Error("Function not implemented."); });

export default router;
