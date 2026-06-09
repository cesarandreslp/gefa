/**
 * Middleware de Next.js
 * Protege rutas /admin con autenticación JWT
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Normalizar el host (e.g. localhost:3000 -> localhost)
  const rawHost = request.headers.get('host') || '';
  const host = rawHost.replace(/^www\./, '').split(':')[0].toLowerCase();
  
  // Propagar el header de dominio
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-domain', host);

  // Instanciar respuesta con headers propagados
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Proteger rutas /super-admin (Aislado de tenants regulares)
  if (pathname.startsWith('/super-admin')) {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    try {
      const payload = await verifyToken(token);

      if (payload.roleCode !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/', request.url));
      }

      return response;
    } catch {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Solo proteger rutas /admin (Mantiene headers en el Request Clonado)
  if (pathname.startsWith('/admin')) {
    // Excluir /admin/login de protección
    if (pathname === '/admin/login') {
      return NextResponse.next();
    }

    // Verificar JWT
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/', request.url), { headers: requestHeaders });
    }

    try {
      const payload = await verifyToken(token);

      // Verificar que NO sea ciudadano (cualquier rol interno tiene acceso a alguna parte del admin)
      if (payload.roleCode === 'CIUDADANO') {
        return NextResponse.redirect(new URL('/', request.url));
      }

      return response; // Continuar con headers inyectados
    } catch {
      return NextResponse.redirect(new URL('/', request.url), { headers: requestHeaders });
    }
  }

  return response; // Aplicar headers globales a las publicas
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'], // Propagar proxy en todo sitio menos assets
};
