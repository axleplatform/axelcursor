/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Enable ESLint during builds
    ignoreDuringBuilds: false,
  },
  
  // CACHE INVALIDATION: Prevent cached builds with old @v0/lib/supabase imports
  generateBuildId: async () => {
    return `build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },
  
  // Ensure clean module resolution
  experimental: {
    esmExternals: true,
  },
  
  images: {
    unoptimized: true,
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ]
  },
}

export default nextConfig
