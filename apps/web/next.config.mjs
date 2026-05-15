/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  transpilePackages: ["@crucible/ui-kit", "@crucible/core", "@crucible/og-client"],
  experimental: { serverComponentsExternalPackages: ["ethers"] },
  webpack: (config) => {
    // RainbowKit pulls in MetaMask SDK + WalletConnect which try to load native-only
    // modules (react-native-async-storage, pino-pretty). Mark them as external so
    // webpack doesn't try to bundle them.
    config.externals.push("pino-pretty", "lokijs", "encoding");
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  },
};
