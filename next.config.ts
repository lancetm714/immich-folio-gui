import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    loader: 'custom',
    loaderFile: './lib/immichLoader.ts',
  },
};

export default nextConfig;
