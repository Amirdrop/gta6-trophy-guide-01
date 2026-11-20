import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "app", "data");
const trophiesPath = join(dataDir, "trophies.json");

function estimateTime(t) {
  const kind = t.kind ?? "";
  const grade = t.grade ?? "";
  const desc = (t.description ?? "").toLowerCase();
  const guide = (t.guide ?? "").toLowerCase();
  const hay = `${kind} ${grade} ${desc} ${guide}`;

  if (kind === "completion") {
    if (grade === "platinum") return "100+ hrs";
    if (grade === "gold") return "80+ hrs";
  }

  if (grade === "platinum") return "100+ hrs";
  if (grade === "gold") return "80+ hrs";
  if (grade === "silver") return "8-12 hrs";

  if (kind === "story") return "1-3 hrs";
  if (kind === "missions") return "2-4 hrs";

  if (kind === "strangers") return "3-5 hrs";
  if (kind === "activities") return "5-8 hrs";
  if (kind === "collectibles") return "8-15 hrs";
  if (kind === "world") return "6-10 hrs";
  if (kind === "crime") return "4-8 hrs";

  return "2-5 hrs";
}

const raw = readFileSync(trophiesPath, "utf8");
const data = JSON.parse(raw);

let changed = 0;
let skipped = 0;

for (const t of data.trophies) {
  if (typeof t.timeEstimate === "string" && t.timeEstimate) {
    skipped++;
    continue;
  }
  t.timeEstimate = estimateTime(t);
  changed++;
}

writeFileSync(trophiesPath, JSON.stringify(data, null, 2) + "\n", "utf8");

const missing = data.trophies.filter(
  (t) => typeof t.timeEstimate !== "string" || !t.timeEstimate
);
if (missing.length) {
  console.error(
    `ERROR: ${missing.length} trophies still lack timeEstimate:`,
    missing.map((t) => t.id)
  );
  process.exit(1);
}

console.log(
  `Enriched ${changed} trophies (skipped ${skipped} already present). Total: ${data.trophies.length}`
);