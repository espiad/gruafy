import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth/session';
import { homeForRole } from '@/lib/auth/session';

/**
 * Callback de confirmación de email / OAuth. Intercambia el code por sesión y
 * redirige al panel según el rol.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (next) return NextResponse.redirect(`${origin}${next}`);
      const profile = await getProfile();
      return NextResponse.redirect(`${origin}${profile ? homeForRole(profile.role) : '/cliente'}`);
    }
  }
  return NextResponse.redirect(`${origin}/ingresar?error=callback`);
}
