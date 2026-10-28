// Entry point for the client-side bundle loaded on every page
import { initAll } from "nhsuk-frontend";

import { initMarkUsefulButtons } from "./mark-useful.js";
import { initPaginatedTables } from "./paginated-table.js";

initAll();
initMarkUsefulButtons();
initPaginatedTables();
