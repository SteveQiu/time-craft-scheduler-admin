import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compositionId = "premium-product-demo";

console.log("🎬 Starting Remotion render for premium-product-demo...");
console.log("Bundling...");

const bundleLocation = await bundle({
  entryPoint: path.resolve(__dirname, "../Root.tsx"),
  publicDir: path.resolve(__dirname, "../public"),
  webpackOverride: (config) => config,
});

console.log("✅ Bundle created");
console.log("Selecting composition...");

const composition = await selectComposition({
  serveUrl: bundleLocation,
  id: compositionId,
});

console.log(`✅ Composition selected: ${composition.id}`);
console.log(`   Duration: ${composition.durationInFrames} frames (${(composition.durationInFrames / composition.fps).toFixed(2)}s)`);
console.log(`   Resolution: ${composition.width}x${composition.height} @ ${composition.fps}fps`);
console.log("");
console.log("Rendering video...");

const outputLocation = path.resolve(__dirname, "../videos/premium-product-demo.mp4");

await renderMedia({
  composition,
  serveUrl: bundleLocation,
  codec: "h264",
  outputLocation,
  onProgress: ({ progress }) => {
    const percent = (progress * 100).toFixed(1);
    process.stdout.write(`\rProgress: ${percent}%`);
  },
});

console.log("");
console.log(`✅ Video rendered successfully!`);
console.log(`   Output: ${outputLocation}`);
