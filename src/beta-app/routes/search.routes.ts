import { Router } from "express";

import {
  renderSearch,
  renderSearchResults,
} from "../controllers/search.controller.js";
import { ensureAuthenticated } from "../middleware/auth.js";

const router = Router();

router.get("/search", ensureAuthenticated, renderSearch);
router.get("/search-results", ensureAuthenticated, renderSearchResults);

export default router;
