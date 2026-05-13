/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  transpilePackages: ["@crucible/ui-kit", "@crucible/core", "@crucible/og-client"],
  experimental: { serverComponentsExternalPackages: ["ethers"] },
};
