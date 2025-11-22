import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import devtools from 'solid-devtools/vite';
import fs from "fs";

function csvPlugin() {
  return {
    name: "csv",
    load(id) {
      function toNum(v){
        if (v == null) return null;
        const n = Number(v);
        // return isNaN(n) ? null : n;
        return isNaN(n) ? "__UNDEFINED_VALUE__" : n;
      }
      if (id.endsWith("daten.csv")) {
        const raw = fs.readFileSync(id, "utf8");
        const lines = raw.split(/\r?\n/).filter(l => l.trim());
        const header = lines[0].split(";").map(h => h.trim());
        const rows = lines.slice(1).map(l => l.split(";").map((c, ci) => {
          c = c.trim();
          if (ci == 0) return c;
          if (!c) return null;
          if (!c) return "__UNDEFINED_VALUE__";
          return toNum(c.replace(",", "."));
        }));
        // return "export default " + JSON.stringify({header, rows}).replace(/"__UNDEFINED_VALUE__"/g, "") + ";";
        return (
          "export default {\n" +
          "header: " + JSON.stringify(header) + ",\n" +
          "rows: [\n" +
          // stringify one row per line
          rows.map(row => JSON.stringify(row).replace(/"__UNDEFINED_VALUE__"/g, "") + ",\n").join("") +
          "],\n" +
          "};"
        );
      }
      return null;
    }
  };
}

export default defineConfig({
  base: "./", // use relative paths to assets
  plugins: [
    csvPlugin(),
    devtools(),
    solidPlugin(),
  ],
  server: {
    port: 3000,
  },
  build: {
    target: "esnext",
    minify: false,
    cssMinify: false,
    rollupOptions: {
      output: {
        // use constant paths
        entryFileNames: "index.js",
        chunkFileNames: "chunk.js",
        assetFileNames: "[name][extname]",
      }
    }
  }
});
