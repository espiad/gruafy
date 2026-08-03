import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth/session';
import { toCsv } from '@/lib/csv';

export async function GET() {
  const profile = await getProfile();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const supabase = await createClient();
  const { data } = await supabase
    .from('payments')
    .select('id, order_id, amount, status, mp_payment_id, mp_preference_id, live_mode, created_at')
    .order('created_at', { ascending: false })
    .limit(5000);

  const csv = toCsv((data ?? []) as unknown as Record<string, unknown>[], [
    'id', 'order_id', 'amount', 'status', 'mp_payment_id', 'mp_preference_id', 'live_mode', 'created_at',
  ]);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="pagos-gruafy.csv"',
    },
  });
}
