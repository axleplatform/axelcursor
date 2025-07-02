/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Enable ESLint during builds - do not ignore errors
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Enable TypeScript checking during builds - do not ignore errors
    ignoreBuildErrors: false,
  },
  images: {
    // Enable image optimization - do not ignore optimization
    unoptimized: false,
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
