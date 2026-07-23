/** @type {import('next').NextConfig} */
export default {
  experimental: { serverActions: { bodySizeLimit: "30mb" } }, // backstop; client shrinks images first (REQ-AST-009)
  transpilePackages: ["@avd/shared", "@avd/plt", "@avd/prj", "@avd/stb", "@avd/gen", "@avd/ast", "@avd/asm"],
  // Remotion ships platform-native binaries — must stay external to the server bundle (REQ-ANM-001).
  serverExternalPackages: ["@remotion/renderer", "@remotion/bundler"],
};
