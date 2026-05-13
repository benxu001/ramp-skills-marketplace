/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      '/api/chat': ['./agents/**/*.md'],
    },
  },
};

export default nextConfig;
