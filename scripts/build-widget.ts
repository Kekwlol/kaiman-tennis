import { build } from "esbuild";
import { mkdirSync } from "node:fs";

async function main() {
  mkdirSync("public", { recursive: true });
  await build({
    entryPoints: ["widget/src/index.ts"],
    bundle: true,
    minify: true,
    format: "iife",
    target: ["es2020"],
    outfile: "public/widget.js",
    logLevel: "info",
  });
  console.log("Widget built -> public/widget.js");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
