import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: false, // Disabled: causes double-render which locks ReadableStream in streaming mode
}

export default nextConfig
