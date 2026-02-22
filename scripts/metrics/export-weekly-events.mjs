#!/usr/bin/env node
import fs from 'fs';

const file = process.argv[2] || 'backend/logs/events.ndjson';
const out = process.argv[3] || `docs/testing/reports/weekly-metrics-${new Date().toISOString().slice(0,10)}.md`;

if (!fs.existsSync(file)) {
  console.error(`事件文件不存在: ${file}`);
  process.exit(1);
}

const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
const counts = new Map();
for (const line of lines) {
  try {
    const e = JSON.parse(line);
    const name = e.event_name || 'unknown';
    counts.set(name, (counts.get(name) || 0) + 1);
  } catch {}
}

const rows = [...counts.entries()].sort((a,b) => b[1]-a[1]);
const md = [
  `# OneDish 周报事件导出`,
  ``,
  `- 源文件: ${file}`,
  `- 导出时间: ${new Date().toISOString()}`,
  ``,
  `| event_name | count |`,
  `|---|---:|`,
  ...rows.map(([k,v]) => `| ${k} | ${v} |`),
  ``,
].join('\n');

fs.writeFileSync(out, md, 'utf8');
console.log(`✅ 已导出: ${out}`);
