// Copies the text-recognition files (tesseract.js) into public/ocr so the scanner
// loads them from our own site instead of a third-party CDN. Runs before dev and build.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkgDir = (name) => dirname(require.resolve(`${name}/package.json`));
const out = join(process.cwd(), "public", "ocr");
mkdirSync(out, { recursive: true });

const files = [
  [join(pkgDir("tesseract.js"), "dist", "worker.min.js"), "worker.min.js"],
  [join(pkgDir("tesseract.js-core"), "tesseract-core-lstm.wasm.js"), "tesseract-core-lstm.wasm.js"],
  [join(pkgDir("tesseract.js-core"), "tesseract-core-simd-lstm.wasm.js"), "tesseract-core-simd-lstm.wasm.js"],
  // The compact "best_int" English model: accurate enough for card text, about 3 MB.
  [join(pkgDir("@tesseract.js-data/eng"), "4.0.0_best_int", "eng.traineddata.gz"), "eng.traineddata.gz"],
];
for (const [from, name] of files) copyFileSync(from, join(out, name));
console.log(`OCR files copied to public/ocr (${files.length})`);
