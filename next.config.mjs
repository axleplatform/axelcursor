/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': './',
    }
    return config
  },
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
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; connect-src 'self' https://maps.googleapis.com https://places.googleapis.com https://*.googleapis.com https://*.supabase.co wss://*.supabase.co https://wxamcdokkjkzhnryxsvd.supabase.co wss://wxamcdokkjkzhnryxsvd.supabase.co; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
          }
        ],
      },
    ]
  },
}

export default nextConfig
