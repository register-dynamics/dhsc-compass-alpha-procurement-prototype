import { Router } from "express";

import {
  renderSearch,
  renderSearchResults,
} from "../controllers/search.controller.js";

const router = Router();

router.get("/search", renderSearch);
router.get("/search-results", renderSearchResults);

export default router;
