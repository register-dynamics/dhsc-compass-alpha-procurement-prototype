/// <reference lib="dom" />

/**
 * Client-side pagination for an NHS table.
 *
 * Wrap the table in an element with `data-module="app-paginated-table"`. All
 * rows are rendered by the server, so without JavaScript the full table is
 * shown. With JavaScript, rows outside the current page are hidden and NHS
 * pagination controls are rendered into `[data-pagination]`.
 *
 * The NHS sortable table (`data-module="nhsuk-table"`) sorts by re-appending
 * rows to the `<tbody>`, so we watch for that and go back to page 1 in the new
 * order.
 *
 * Optional elements inside the wrapper:
 * - `[data-pagination-status]` – updated with "Showing X to Y of Z, ordered …"
 * - `data-page-size` on the wrapper – rows per page (default 20)
 */

const arrowLeft =
  '<svg class="nhsuk-icon nhsuk-icon--arrow-left" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><path d="M10.7 6.3c.4.4.4 1 0 1.4L7.4 11H19a1 1 0 0 1 0 2H7.4l3.3 3.3c.4.4.4 1 0 1.4a1 1 0 0 1-1.4 0l-5-5A1 1 0 0 1 4 12c0-.3.1-.5.3-.7l5-5a1 1 0 0 1 1.4 0Z"/></svg>';
const arrowRight =
  '<svg class="nhsuk-icon nhsuk-icon--arrow-right" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><path d="m14.7 6.3 5 5c.2.2.3.4.3.7 0 .3-.1.5-.3.7l-5 5a1 1 0 0 1-1.4-1.4l3.3-3.3H5a1 1 0 0 1 0-2h11.6l-3.3-3.3a1 1 0 1 1 1.4-1.4Z"/></svg>';

class PaginatedTable {
  private readonly $body: HTMLTableSectionElement;
  private readonly $pagination: HTMLElement;
  private readonly $root: HTMLElement;
  private readonly $status: HTMLElement | null;
  private page = 1;
  private readonly pageSize: number;

  private get pageCount(): number {
    return Math.max(1, Math.ceil(this.rows.length / this.pageSize));
  }

  private get rows(): HTMLTableRowElement[] {
    return Array.from(this.$body.rows);
  }

  constructor($root: HTMLElement) {
    const $body = $root.querySelector<HTMLTableSectionElement>("tbody");
    const $pagination = $root.querySelector<HTMLElement>("[data-pagination]");
    if (!$body || !$pagination) {
      throw new Error("Paginated table needs a <tbody> and [data-pagination]");
    }

    this.$root = $root;
    this.$body = $body;
    this.$pagination = $pagination;
    this.$status = $root.querySelector<HTMLElement>("[data-pagination-status]");
    this.pageSize = Number($root.dataset.pageSize) || 20;

    // The NHS table re-appends every row when it sorts; one callback per batch
    new MutationObserver(() => {
      this.goTo(1);
    }).observe($body, {
      childList: true,
    });

    $pagination.addEventListener("click", (event) => {
      this.handleClick(event);
    });

    this.render();
  }

  /** Describe the current NHS table sort, e.g. "A to Z" or "most first" */
  private describeOrder(): string {
    const $header = this.$root.querySelector<HTMLTableCellElement>(
      "th[aria-sort='ascending'], th[aria-sort='descending']",
    );
    if (!$header) {
      return "";
    }
    const ascending = $header.getAttribute("aria-sort") === "ascending";
    if ($header.classList.contains("nhsuk-table__header--numeric")) {
      const name = $header.textContent.trim().toLowerCase();
      return `by ${name} (${ascending ? "fewest" : "most"} first)`;
    }
    return ascending ? "A to Z" : "Z to A";
  }

  private goTo(page: number) {
    this.page = Math.min(Math.max(1, page), this.pageCount);
    this.render();
  }

  private handleClick(event: MouseEvent) {
    const $link = (event.target as Element).closest<HTMLAnchorElement>(
      "a[data-page]",
    );
    if (!$link) {
      return;
    }
    event.preventDefault();
    this.goTo(Number($link.dataset.page));

    // Take keyboard and screen reader users back to the top of the results
    const $focus = this.$status ?? this.$root;
    $focus.setAttribute("tabindex", "-1");
    $focus.focus({ preventScroll: true });
    this.$root.scrollIntoView({ block: "start" });
  }

  /** Page numbers to show, with null for an ellipsis, e.g. [1, null, 4, 5, 6, null, 9] */
  private pageNumbers(): (null | number)[] {
    const { page, pageCount } = this;
    const isShown = (n: number) =>
      n === 1 || n === pageCount || Math.abs(n - page) <= 1;
    const numbers: (null | number)[] = [];
    for (let n = 1; n <= pageCount; n++) {
      // Show a lone hidden page rather than an ellipsis in its place
      if (isShown(n) || (isShown(n - 1) && isShown(n + 1))) {
        numbers.push(n);
      } else if (numbers[numbers.length - 1] !== null) {
        numbers.push(null);
      }
    }
    return numbers;
  }

  private paginationHtml(): string {
    const { page, pageCount } = this;

    const items = this.pageNumbers()
      .map((n) => {
        if (n === null) {
          return '<li class="nhsuk-pagination__item nhsuk-pagination__item--ellipsis">&ctdot;</li>';
        }
        const current = n === page;
        const label = String(n);
        return `<li class="nhsuk-pagination__item${current ? " nhsuk-pagination__item--current" : ""}">
          <a class="nhsuk-pagination__link" href="#" data-page="${label}" aria-label="Page ${label}"${current ? ' aria-current="page"' : ""}>${label}</a>
        </li>`;
      })
      .join("");

    const previous =
      page > 1
        ? `<a href="#" class="nhsuk-pagination__previous" rel="prev" data-page="${String(page - 1)}">
            ${arrowLeft}
            <span class="nhsuk-pagination__title">Previous<span class="nhsuk-u-visually-hidden"> page</span></span>
          </a>`
        : "";

    const next =
      page < pageCount
        ? `<a href="#" class="nhsuk-pagination__next" rel="next" data-page="${String(page + 1)}">
            <span class="nhsuk-pagination__title">Next<span class="nhsuk-u-visually-hidden"> page</span></span>
            ${arrowRight}
          </a>`
        : "";

    return `${previous}<ul class="nhsuk-pagination__list">${items}</ul>${next}`;
  }

  private render() {
    const { page, pageCount, pageSize, rows } = this;
    const start = (page - 1) * pageSize;
    const end = Math.min(start + pageSize, rows.length);

    rows.forEach(($row, index) => {
      $row.hidden = index < start || index >= end;
    });

    if (this.$status) {
      const order = this.describeOrder();
      this.$status.textContent =
        `Showing ${String(rows.length ? start + 1 : 0)} to ${String(end)} of ${String(rows.length)}` +
        (order ? `, ordered ${order}.` : ".");
    }

    this.$pagination.hidden = pageCount <= 1;
    this.$pagination.innerHTML = pageCount > 1 ? this.paginationHtml() : "";
  }
}

export function initPaginatedTables(scope: ParentNode = document) {
  scope
    .querySelectorAll<HTMLElement>('[data-module="app-paginated-table"]')
    .forEach(($root) => new PaginatedTable($root));
}
