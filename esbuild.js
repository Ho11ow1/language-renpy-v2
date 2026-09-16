const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

/**
 * @type {import("esbuild").Plugin}
 */
const wasmEditorConfigPlugin = {
	name: "editorconfig-bundle-plugin",

	setup(build)
	{
		build.onEnd(() => {
			const wasmPath = require.resolve("@one-ini/wasm/one_ini_bg.wasm", { paths: [path.dirname(require.resolve("editorconfig"))] });

			fs.copyFileSync(wasmPath, path.join("dist", "one_ini_bg.wasm"));
		});
	},
};

/**
 * @type {import("esbuild").Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: "esbuild-problem-matcher",

	setup(build)
	{
		build.onStart(() => {
			console.log(`[watch] build started (${build.initialOptions.outfile})`);
		});

		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});

			console.log(`[watch] build finished (${build.initialOptions.outfile})`);
		});
	},
};

async function buildTarget(entry, outfile, additionalPlugins = [])
{
	const ctx = await esbuild.context({
		entryPoints: [ entry ],
		bundle: true,
		format: "cjs",
		minify: production,
		sourcemap: false,
		sourcesContent: false,
		platform: "node",
		outfile: outfile,
		external: ["vscode"],
		logLevel: "silent",
		tsconfig: "tsconfig.json",
		plugins: [ esbuildProblemMatcherPlugin, ...additionalPlugins],
	});

	if (watch)
	{
		await ctx.watch();
	} 
	else
	{
		await ctx.rebuild();
		await ctx.dispose();
	}
}

async function main()
{
	await Promise.all([
		buildTarget("client/extension.ts", "dist/extension.js"),
		buildTarget("server/server.ts", "dist/server.js", [wasmEditorConfigPlugin])
	]);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
