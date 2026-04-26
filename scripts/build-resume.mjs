#!/usr/bin/env node
/**
 * Render src/lib/docs/resume.md → static/resume.pdf with embedded styles.
 * Run: pnpm build:resume
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MD_PATH = resolve(ROOT, 'src/lib/docs/resume.md');
const OUT_PATH = resolve(ROOT, 'static/resume.pdf');

const STYLE = `
	:root { color-scheme: light; }
	* { box-sizing: border-box; }
	body {
		margin: 0;
		background: #fff;
		color: #1a1a1a;
		font-family: 'Source Serif Pro', Georgia, 'Times New Roman', serif;
		-webkit-font-smoothing: antialiased;
		line-height: 1.55;
		font-size: 10.5pt;
	}
	.resume-doc {
		max-width: 7.4in;
		margin: 0 auto;
	}
	.resume-doc > :first-child { margin-top: 0; }
	.resume-doc h1 {
		font-size: 22pt;
		font-weight: 800;
		letter-spacing: -0.01em;
		margin: 0 0 0.1em;
		line-height: 1.1;
	}
	.resume-doc h1 + p {
		margin: 0.1em 0 0.4em;
		color: #2b5c8a;
		font-weight: 600;
		font-size: 11pt;
	}
	.resume-doc h2 {
		font-size: 9.5pt;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #5a5245;
		margin: 1.6em 0 0.5em;
		padding-bottom: 0.25em;
		border-bottom: 1px solid #d5cfc4;
	}
	.resume-doc h3 {
		font-size: 11pt;
		font-weight: 700;
		margin: 1.1em 0 0.2em;
	}
	.resume-doc p { margin: 0.35em 0; }
	.resume-doc h3 + p em {
		color: #5a5245;
		font-style: italic;
		font-size: 0.94em;
	}
	.resume-doc strong { font-weight: 700; }
	.resume-doc a {
		color: #2b5c8a;
		text-decoration: underline;
		text-underline-offset: 2px;
		text-decoration-thickness: 0.5pt;
	}
	.resume-doc hr {
		border: none;
		border-top: 1px solid #e8e2d8;
		margin: 1.4em 0;
	}
	.resume-doc ul {
		padding-left: 1.2em;
		margin: 0.4em 0;
	}
	.resume-doc li {
		margin: 0.3em 0;
		line-height: 1.5;
	}
	.resume-doc table {
		border-collapse: collapse;
		margin: 0.4em 0 0.8em;
		width: 100%;
	}
	.resume-doc thead { display: none; }
	.resume-doc td {
		padding: 0.25em 0.6em 0.25em 0;
		vertical-align: top;
		border: none;
	}
	.resume-doc tbody tr td:first-child {
		font-weight: 600;
		white-space: nowrap;
		color: #5a5245;
		width: 1%;
		padding-right: 1.2em;
	}
	.resume-doc h1, .resume-doc h2, .resume-doc h3 {
		break-after: avoid;
		page-break-after: avoid;
	}
	.resume-doc li, .resume-doc tr {
		break-inside: avoid;
		page-break-inside: avoid;
	}
`;

async function main() {
	const md = await readFile(MD_PATH, 'utf8');
	const body = marked.parse(md);
	const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Casey Haber — Resume</title>
<style>${STYLE}</style>
</head>
<body>
<article class="resume-doc">${body}</article>
</body>
</html>`;

	await mkdir(dirname(OUT_PATH), { recursive: true });

	const browser = await puppeteer.launch({ headless: true });
	try {
		const page = await browser.newPage();
		await page.setContent(html, { waitUntil: 'networkidle0' });
		await page.pdf({
			path: OUT_PATH,
			format: 'Letter',
			printBackground: true,
			margin: { top: '0.55in', right: '0.6in', bottom: '0.55in', left: '0.6in' }
		});
		console.log(`✓ wrote ${OUT_PATH}`);
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
