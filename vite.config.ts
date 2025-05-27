import react from "@vitejs/plugin-react";
import { rmSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import electron from "vite-plugin-electron/simple";
import pkg from "./package.json";

export default defineConfig(({ command }) => {
  rmSync("dist-electron", { recursive: true, force: true });

  const isServe = command === "serve";
  const isBuild = command === "build";
  const sourcemap = isServe || !!process.env.VSCODE_DEBUG;

  return {
    build: {
      sourcemap,
      minify: isBuild,
      assetsDir: "",
    },
    resolve: {
      alias: {
        "@": path.join(__dirname, "src"),
        "@shadcn": path.join(__dirname, "src/components/shadcn"),
        // fix loading all icon chunks in dev mode
        // https://github.com/tabler/tabler-icons/issues/1233
        '@tabler/icons-react': '@tabler/icons-react/dist/esm/icons/index.mjs',
      },
    },
    plugins: [
      react({
        babel: {
          plugins: [
            ["babel-plugin-react-compiler", { target: '19' }],
          ],
        },
      }),
      electron({
        main: {
          // Shortcut of `build.lib.entry`
          entry: "electron/main.ts",
          onstart(args) {
            const argv = ['.', '--no-sandbox', '--remote-debugging-port=9229'];
            if (process.env.VSCODE_DEBUG) {
              console.log(/* For `.vscode/.debug.script.mjs` */ "[startup] Electron App");
            } else {
              args.startup(argv).then();
            }
          },
          vite: {
            build: {
              sourcemap,
              minify: isBuild,
              outDir: "dist-electron",
              rollupOptions: {
                external: [...Object.keys("dependencies" in pkg ? pkg.dependencies : {})],
              },
            },
            resolve: {
              alias: {
                "@": path.join(__dirname, "src"),
              },
            },
          },
        },
        preload: {
          // Shortcut of `build.rollupOptions.input`.
          // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
          input: "electron/preload.ts",
          vite: {
            build: {
              sourcemap: sourcemap ? "inline" : undefined, // #332
              minify: isBuild,
              outDir: "dist-electron",
              rollupOptions: {
                external: [...Object.keys("dependencies" in pkg ? pkg.dependencies : {})],
              },
            },
            resolve: {
              alias: {
                "@": path.join(__dirname, "src"),
              },
            },
          },
        }
      }) as any,
    ],
    server:
      process.env.VSCODE_DEBUG &&
      (() => {
        const url = new URL(pkg.debug.env.VITE_DEV_SERVER_URL);
        return {
          host: url.hostname,
          port: +url.port,
        };
      })(),
    clearScreen: false,
  };
});
