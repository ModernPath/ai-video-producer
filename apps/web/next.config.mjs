/** @type {import('next').NextConfig} */
export default {
  experimental: {
    serverActions: { bodySizeLimit: "30mb" }, // backstop; client shrinks images first (REQ-AST-009)
    // TypeScript 7 dropped the compiler API Next.js reads for its dev-mode type plugin, so
    // `next dev` refused to boot after the 2026-07-27 upgrade while `next build` was unaffected.
    // Next names this flag in the error itself. Types are gated by `pnpm check` regardless.
    useTypeScriptCli: true,
  },
  transpilePackages: ["@avd/shared", "@avd/plt", "@avd/prj", "@avd/stb", "@avd/gen", "@avd/ast", "@avd/asm"],
  // Remotion ships platform-native binaries — must stay external to the server bundle (REQ-ANM-001).
  serverExternalPackages: ["@remotion/renderer", "@remotion/bundler"],
};
