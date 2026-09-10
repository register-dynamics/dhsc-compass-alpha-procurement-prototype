// Script to parse Pa11y accessibility reports and extract relevant information to output as markdown
import fs from "node:fs";

const reportFilePath = "reports/pa11y-results.json";

const report = JSON.parse(fs.readFileSync(reportFilePath, "utf-8"));

const markdown = ["# Pa11y Accessibility Report"];

markdown.push(`Total: ${report.total}\n`);
markdown.push(`Passes: ${report.passes}\n`);
markdown.push(`Errors: ${report.errors}\n`);

for (const [url, issues] of Object.entries(report.results)) {
    markdown.push(`\n## ${url}`);
    if (issues.length === 0) {
        markdown.push("No issues found.");
    } else {
        for (const issue of issues) {
            markdown.push(`### ${issue.code}`);
            markdown.push(`**Type:** ${issue.type}\n`);
            markdown.push(`**Message:** ${issue.message}\n`);
            markdown.push(`**Context:** \`${issue.context}\`\n`);
            markdown.push(`**Selector:** ${issue.selector}\n`);
        }
    }
}

console.log(markdown.join("\n"));
