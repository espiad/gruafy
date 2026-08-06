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

  const rol = searchParams.get('rol');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Alta de GRÚA con Google: el proveedor OAuth no transmite el rol pretendido,
      // así que la cuenta nace como 'client'. Acá la promovemos a proveedor.
      // Es seguro: solo client → provider_owner (nunca admin, y solo si todavía no
      // tiene cuenta de proveedor). El rol de proveedor no da permisos por sí solo:
      // igual necesita que un administrador apruebe la cuenta.
      if (rol === 'proveedor') {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            const { createAdminClient } = await import('@/lib/supabase/admin');
            const admin = createAdminClient();
            const { data: perfil } = await admin.from('profiles').select('role').eq('id', user.id).single();
            if (perfil?.role === 'client') {
              const { data: yaTiene } = await admin
                .from('provider_accounts')
                .select('id')
                .eq('owner_id', user.id)
                .maybeSingle();
              if (!yaTiene) {
                await admin.from('profiles').update({ role: 'provider_owner' }).eq('id', user.id);
              }
            }
          }
        } catch {
          /* si falla, el usuario queda como cliente y puede reintentar el alta */
        }
      }
      if (next) return NextResponse.redirect(`${origin}${next}`);
      const profile = await getProfile();
      return NextResponse.redirect(`${origin}${profile ? homeForRole(profile.role) : '/cliente'}`);
    }
  }
  return NextResponse.redirect(`${origin}/ingresar?error=callback`);
}
