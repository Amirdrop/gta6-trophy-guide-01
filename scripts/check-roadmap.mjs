import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "app", "data");

const trophies = JSON.parse(
  readFileSync(join(dataDir, "trophies.json"), "utf8")
);
const roadmap = JSON.parse(readFileSync(join(dataDir, "roadmap.json"), "utf8"));

const trophyIds = new Set(trophies.trophies.map((t) => t.id));
let errors = 0;

const seen = new Set();
for (const stage of roadmap) {
  for (const entry of stage.trophies) {
    const id = entry.id;
    if (!trophyIds.has(id)) {
      console.error(`Stage ${stage.stage}: trophy id ${id} not in trophies.json`);
      errors++;
    }
    if (seen.has(id)) {
      console.error(`Stage ${stage.stage}: trophy id ${id} referenced more than once`);
      errors++;
    }
    seen.add(id);
  }
}

const referenced = new Set([...seen]);
for (const t of trophies.trophies) {
  if (!referenced.has(t.id)) {
    console.warn(`trophy ${t.id} (${t.name}) is not referenced in roadmap`);
  }
}

console.log(`Referenced ids: ${referenced.size}; total trophies: ${trophies.trophies.length}`);
if (errors) {
  console.error(`ERRORS: ${errors}`);
  process.exit(1);
}
console.log("All roadmap trophy ids exist in trophies.json and are unique.");