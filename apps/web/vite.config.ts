// import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
// import { devtools } from "@tanstack/devtools-vite";
import tsconfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
	plugins: [
		// cloudflare({ viteEnvironment: { name: "ssr" } }),
		// devtools(),
		tsconfigPaths({ projects: ["./tsconfig.json"] }),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
	server: {
		proxy: {
			"/api": {
				target: "http://localhost:3000",
				changeOrigin: true,
				secure: false,
				// TODO: change /api proxy to something else to avoid collision with tanstack start api
				bypass: (req) => {
					const url = req.url ?? "";

					if (
						url.startsWith("/api/customer-upload") ||
						url.startsWith("/api/customer-profiles") ||
						url.startsWith("/api/document-signing/public") ||
						url.startsWith("/api/upload") ||
						url.startsWith("/api/branding-upload")
					) {
						return url;
					}
				},
				rewrite: (path) => path.replace(/^\/api/, ""),
			},
		},
	},
});

export default config;
