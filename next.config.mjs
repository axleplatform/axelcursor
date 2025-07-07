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
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://maps.gstatic.com; img-src 'self' data: https://maps.googleapis.com https://maps.gstatic.com https://streetviewpixels-pa.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://maps.googleapis.com;"
          }
        ],
      },
    ]
  },
}

export default nextConfig
  