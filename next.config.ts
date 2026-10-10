import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: false, // Disabled: causes double-render which locks ReadableStream in streaming mode
  serverExternalPackages: ['vercel'],
  outputFileTracingIncludes: {
    '/api/projects/*/integrations': ['./node_modules/vercel/**/*'],
    '/api/projects/*/vercel-deployments': ['./node_modules/vercel/**/*'],
  },
}

export default nextConfig
