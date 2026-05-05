const esbuild = require("esbuild");

const isWatch = process.argv.includes("--watch");
const isProd = process.argv.includes("--production");

const buildOpts = {
  entryPoints: ["src/extension/index.ts"],
  bundle: true,
  outfile: "dist/extension.js",
  external: ["vscode"],
  format: "cjs",
  platform: "node",
  target: "node18",
  sourcemap: !isProd,
  minify: isProd,
  drop: isProd ? ["console", "debugger"] : [],
  define: {
    "process.env.NODE_ENV": isProd ? '"production"' : '"development"',
  },
  logLevel: "info",
  plugins: [],
};

if (isWatch) {
  esbuild.context(buildOpts).then((ctx) => {
    ctx.watch();
    console.log("[esbuild] Watching for changes...");
  });
} else {
  esbuild.build(buildOpts).then(() => {
    console.log("[esbuild] Build complete.");
  });
}
