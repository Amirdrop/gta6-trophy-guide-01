import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "..", "app", "data");

const trophies = JSON.parse(readFileSync(join(dataDir, "trophies.json"), "utf8"));
const raw = JSON.parse(readFileSync(join(dataDir, "roadmap.json"), "utf8"));
const stages = Array.isArray(raw) ? raw : Array.isArray(raw.stages) ? raw.stages : [];

const list = Array.isArray(trophies) ? trophies : trophies.trophies;
const trophyIds = new Set(list.map((t) => t.id));

let errors = 0;
const seen = new Set();

for (const stage of stages) {
  const refs = Array.isArray(stage.trophies) ? stage.trophies : [];
  for (const ref of refs) {
    const id = ref && typeof ref === "object" ? ref.id : ref;
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

for (const t of list) {
  if (!seen.has(t.id)) {
    console.warn(`trophy ${t.id} (${t.name}) is not referenced in roadmap`);
  }
}

console.log(`Referenced ids: ${seen.size}; total trophies: ${list.length}`);
if (errors) {
  console.error(`ERRORS: ${errors}`);
  process.exit(1);
}
console.log("All roadmap trophy ids exist in trophies.json and are unique.");
