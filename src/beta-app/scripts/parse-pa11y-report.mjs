// Script to parse Pa11y accessibility reports and extract relevant information to output as markdown
import fs from "node:fs";

const reportFilePath = "reports/pa11y-results.json";

const report = JSON.parse(fs.readFileSync(reportFilePath, "utf-8"));

// Show the path only, as every URL shares the same local origin
const displayUrl = (url) => {
  try {
    const { pathname, search } = new URL(url);
    return decodeURIComponent(pathname + search);
  } catch {
    return url;
  }
};

// Keep inline code intact if the context itself contains backticks or newlines
const inlineCode = (value) => {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const fence = text.includes("`") ? "``" : "`";
  return `${fence} ${text} ${fence}`;
};

const details = (summary, body) =>
  [
    "<details>",
    `<summary>${summary}</summary>`,
    "",
    ...body,
    "",
    "</details>",
  ].join("\n");

const entries = Object.entries(report.results);
const passed = entries.filter(([, issues]) => issues.length === 0);
const failed = entries.filter(([, issues]) => issues.length > 0);
const issueCount = failed.reduce((sum, [, issues]) => sum + issues.length, 0);

const markdown = ["# Pa11y Accessibility Report", ""];

markdown.push(
  report.errors > 0
    ? `❌ **${report.errors} of ${report.total} pages have accessibility issues (${issueCount} issues in total)**`
    : `✅ **All ${report.total} pages passed**`,
);
markdown.push("");
markdown.push(`- 📄 Total: ${report.total}`);
markdown.push(`- ✅ Passes: ${report.passes}`);
markdown.push(`- ${report.errors > 0 ? "❌" : "✅"} Errors: ${report.errors}`);
markdown.push("");

if (failed.length > 0) {
  const pages = failed.map(([url, issues]) => {
    const body = issues.map((issue) => {
      // pa11y-ci records page load failures as an issue without a code
      if (!issue.code) {
        return `- ⚠️ **Page failed to load:** ${issue.message ?? "Unknown error"}`;
      }
      return [
        `- **${issue.code}** (${issue.type})`,
        `  - **Message:** ${issue.message}`,
        `  - **Selector:** ${inlineCode(issue.selector)}`,
        `  - **Context:** ${inlineCode(issue.context)}`,
      ].join("\n");
    });
    return details(
      `<code>${displayUrl(url)}</code> (${issues.length} issue${issues.length === 1 ? "" : "s"})`,
      body,
    );
  });
  markdown.push(
    details(`❌ <strong>Errors (${failed.length})</strong>`, pages),
  );
  markdown.push("");
}

if (passed.length > 0) {
  markdown.push(
    details(
      `✅ <strong>Passes (${passed.length})</strong>`,
      passed.map(([url]) => `- \`${displayUrl(url)}\``),
    ),
  );
}

console.log(markdown.join("\n"));
