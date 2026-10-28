/// <reference lib="dom" />

/**
 * "Mark as useful" toggle buttons for product evidence.
 *
 * Rendered by the `mark_useful_button` macro: a `.mark-useful-button` with
 * `data-evidence-id`, `data-product-id` and `data-marked`, and a matching
 * `.useful-count[data-evidence-id]` showing how many people found it useful.
 * Clicking the button posts to the server and updates both from the response.
 */

const tick =
  '<svg class="nhsuk-icon nhsuk-icon--tick" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><path d="M11.4 17.5a2 2 0 0 1-2.7.1h-.1L4 12.8a1.5 1.5 0 0 1 2.1-2L10 14.7l8.1-8.1a1.5 1.5 0 1 1 2.2 2l-8.9 9Z"/></svg>';

interface UsefulResponse {
  count?: null | number;
}

export function initMarkUsefulButtons(scope: ParentNode = document) {
  scope
    .querySelectorAll<HTMLButtonElement>(".mark-useful-button")
    .forEach(($button) => {
      $button.addEventListener("click", () => {
        void toggleUseful($button);
      });
    });
}

async function toggleUseful($button: HTMLButtonElement) {
  const { evidenceId, productId } = $button.dataset;
  const mark = $button.dataset.marked !== "true";
  const action = mark ? "mark" : "unmark";

  const response = await fetch(`/product/${action}-useful`, {
    body: JSON.stringify({ evidenceId, productId }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) {
    console.error(`Failed to ${action} useful: `, response);
    return;
  }

  const { count } = (await response.json()) as UsefulResponse;
  if (count === undefined || count === null) {
    console.error(`Failed to ${action} useful: no useful count returned`);
    return;
  }

  updateButton($button, mark);
  updateCount(evidenceId, count);
}

function updateButton($button: HTMLButtonElement, marked: boolean) {
  $button.setAttribute("aria-pressed", String(marked));
  $button.dataset.marked = String(marked);
  $button.innerHTML = marked
    ? `${tick} <span class="nhsuk-button__content">Marked as useful</span>`
    : "Mark as useful";
}

function updateCount(evidenceId: string | undefined, count: number) {
  const $count = document.querySelector<HTMLElement>(
    `.useful-count[data-evidence-id="${evidenceId ?? ""}"]`,
  );
  if (!$count) {
    return;
  }
  if (count === 0) {
    $count.innerHTML = "";
    return;
  }
  const people = count === 1 ? "person" : "people";
  $count.innerHTML = `${tick} <strong>${String(count)} ${people}</strong> found this useful`;
}
