import { Router } from "express";

import {
  postSignIn,
  renderSignIn,
  signOut,
} from "../controllers/session.controller.js";

const router = Router();

router.get("/sign-in", renderSignIn);
router.post("/sign-in", postSignIn);

router.get("/sign-out", signOut);

export default router;
