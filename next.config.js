/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Solo modo API (no SSR ni generación estática para UI)
  // En FASE 0 solo backend
  reactStrictMode: true,
  
  // Variables de entorno expuestas al cliente (ninguna por ahora)
  env: {
    API_VERSION: 'v1',
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fdoixkkzivchra49.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  
  // Panel interno unificado en /admin (comisaría). El panel Ventanilla heredado
  // /home se retira: estas reglas redirigen sus rutas al equivalente de comisaría.
  async redirects() {
    return [
      { source: '/home/casos/:path*', destination: '/admin/cases', permanent: false },
      { source: '/home/cierre-casos/:path*', destination: '/admin/cases', permanent: false },
      { source: '/home/cargos', destination: '/admin/cargos', permanent: false },
      { source: '/home/usuarios/:path*', destination: '/admin/usuarios', permanent: false },
      { source: '/home/registro', destination: '/admin/usuarios', permanent: false },
      { source: '/home/configuracion-entidad', destination: '/admin/entidad', permanent: false },
      { source: '/home/editor-landing', destination: '/admin/settings', permanent: false },
      { source: '/home', destination: '/admin/family', permanent: false },
      { source: '/home/:path*', destination: '/admin/family', permanent: false },
      // Páginas heredadas de Ventanilla en /admin (PQRS) → módulo de comisaría
      { source: '/admin/inbox/:path*', destination: '/admin/family', permanent: false },
      { source: '/admin/inbox', destination: '/admin/family', permanent: false },
      { source: '/admin/solicitudes/:path*', destination: '/admin/family', permanent: false },
      { source: '/admin/cases/:path*', destination: '/admin/family', permanent: false },
      { source: '/admin/cases', destination: '/admin/family', permanent: false },
    ];
  },

  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
}

module.exports = nextConfig;
