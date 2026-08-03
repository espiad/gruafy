'use server';

import { createClient } from '@/lib/supabase/server';

interface LocationInput {
  orderId: string;
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
}

/**
 * Persiste una posición del proveedor para una orden y actualiza su última
 * ubicación conocida. RLS garantiza que solo el proveedor asignado pueda insertar.
 */
export async function saveLocation(input: LocationInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const };

  const { data: order } = await supabase
    .from('service_orders')
    .select('id, provider_id')
    .eq('id', input.orderId)
    .single();
  if (!order?.provider_id) return { ok: false as const };

  await supabase.from('tracking_locations').insert({
    order_id: input.orderId,
    provider_id: order.provider_id,
    lat: input.lat,
    lng: input.lng,
    accuracy: input.accuracy ?? null,
    heading: input.heading ?? null,
    speed: input.speed ?? null,
  });

  await supabase
    .from('provider_accounts')
    .update({ last_lat: input.lat, last_lng: input.lng, last_location_at: new Date().toISOString() })
    .eq('id', order.provider_id);

  return { ok: true as const };
}
