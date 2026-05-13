/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      '/api/chat': ['./agents/**/*.md'],
      '/api/diagnose': ['./agents/**/*.md'],
    },
  },
};

export default nextConfig;
