// qa-stills.mjs — bundle ONCE, render many stills (avoids per-still 2.7GB public copy)
// Usage: node scripts/qa-stills.mjs FullVideo14 <outdir> 600 4400 6073 ...
import { bundle } from "@remotion/bundler";
import { selectComposition, renderStill } from "@remotion/renderer";
import path from "path";
import fs from "fs";

const [compId, outDir, ...frameArgs] = process.argv.slice(2);
const frames = frameArgs.map(Number);
fs.mkdirSync(outDir, { recursive: true });

console.log("Bundling once…");
const serveUrl = await bundle({
  entryPoint: path.resolve("src/index.ts"),
  onProgress: () => {},
});
console.log("Bundle ready. Selecting composition…");
const comp = await selectComposition({ serveUrl, id: compId });

for (const f of frames) {
  const out = path.join(outDir, `frame-${String(f).padStart(6, "0")}.png`);
  await renderStill({ serveUrl, composition: comp, output: out, frame: f, imageFormat: "png" });
  console.log("done", f);
}
console.log("QA_STILLS_DONE");
