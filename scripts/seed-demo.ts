/**
 * Seed de demostración para gruafy. SOLO para entornos no productivos.
 *
 * Crea usuarios demo (cliente, gruero, admin), una grúa aprobada y disponible,
 * vehículos y órdenes de ejemplo en distintos estados, para poder mostrar el
 * recorrido completo sin cargar datos a mano.
 *
 * Uso (con .env.local cargado):
 *   npx tsx --env-file=.env.local scripts/seed-demo.ts
 *
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (process.env.NODE_ENV === 'production') {
  console.error('No ejecutes el seed de demo en producción.');
  process.exit(1);
}
if (!url || !serviceKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const DEMO_PASSWORD = 'gruafy-demo-2026';

async function ensureUser(email: string, meta: Record<string, unknown>) {
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: meta,
  });
  if (error && !/already/i.test(error.message)) throw error;
  if (created?.user) return created.user.id;
  // Ya existía: buscarlo.
  const { data: list } = await admin.auth.admin.listUsers();
  const found = list.users.find((u) => u.email === email);
  if (!found) throw new Error(`No se pudo obtener el usuario ${email}`);
  return found.id;
}

async function main() {
  console.log('Sembrando datos de demostración…');

  const clientId = await ensureUser('cliente.demo@gruafy.com', { first_name: 'Cami', last_name: 'Demo' });
  const ownerId = await ensureUser('grua.demo@gruafy.com', { first_name: 'Carlos', last_name: 'Grúa' });
  await admin.from('profiles').update({ role: 'provider_owner', first_name: 'Carlos', last_name: 'Grúa', phone: '1150000001' }).eq('id', ownerId);
  await admin.from('profiles').update({ first_name: 'Cami', last_name: 'Demo', phone: '1150000002' }).eq('id', clientId);

  // Proveedor aprobado y disponible (CABA).
  const { data: existingProvider } = await admin.from('provider_accounts').select('id').eq('owner_id', ownerId).maybeSingle();
  let providerId = existingProvider?.id;
  if (!providerId) {
    const { data: prov } = await admin
      .from('provider_accounts')
      .insert({
        owner_id: ownerId,
        legal_name: 'Grúas del Sur SRL',
        cuit: '30716595540',
        contact_email: 'grua.demo@gruafy.com',
        contact_phone: '1150000001',
        status: 'approved',
        is_available: true,
        last_lat: -34.6037,
        last_lng: -58.3816,
        last_location_at: new Date().toISOString(),
        rating_avg: 4.8,
        rating_count: 37,
      })
      .select('id')
      .single();
    providerId = prov!.id;
    await admin.from('provider_members').insert({ provider_id: providerId, user_id: ownerId, role: 'owner', full_name: 'Carlos Grúa', phone: '1150000001' });
    await admin.from('tow_trucks').insert({ provider_id: providerId, patente: 'AB123CD', brand: 'Iveco', model: 'Daily', year: 2019, capacity: 'Hasta 3.500 kg' });
  }

  // Vehículo del cliente.
  const { data: existingVehicle } = await admin.from('vehicles').select('id').eq('client_id', clientId).maybeSingle();
  let vehicleId = existingVehicle?.id;
  if (!vehicleId) {
    const { data: veh } = await admin
      .from('vehicles')
      .insert({ client_id: clientId, brand: 'Volkswagen', model: 'Gol', year: 2015, patente: 'MJP452', gearbox: 'manual', has_keys: true })
      .select('id')
      .single();
    vehicleId = veh!.id;
  }

  const pricingSnapshot = {
    km_facturables: 10, movida_base: 35000, costo_km: 25000, costo_dollys: 0,
    subtotal_proveedor: 60000, iva_gruero: 12600, saldo_estimado_gruero: 72600,
    comision_gruafy: 12000, fee_mp: 755, iva_fee_mp: 159, pago_inicial_cliente: 12914,
  };

  async function makeOrder(state: string, extra: Record<string, unknown> = {}) {
    const { data } = await admin
      .from('service_orders')
      .insert({
        client_id: clientId,
        vehicle_id: vehicleId,
        origin_address: 'Av. Corrientes 1000, CABA',
        origin_lat: -34.6037, origin_lng: -58.3816,
        dest_address: 'Av. Cabildo 2000, CABA',
        dest_lat: -34.5627, dest_lng: -58.4585,
        dollys: 0, wheels_blocked: 0,
        distance_meters: 9800, duration_seconds: 1500,
        pricing: pricingSnapshot, amount_upfront: 12914,
        state,
        ...extra,
      })
      .select('id')
      .single();
    if (data) {
      await admin.from('order_events').insert({ order_id: data.id, to_state: state, event: 'Estado de demostración' });
    }
    return data?.id;
  }

  await makeOrder('searching_provider', { searching_at: new Date().toISOString() });
  await makeOrder('completed', { provider_id: providerId, paid_at: new Date(Date.now() - 86400000).toISOString(), completed_at: new Date(Date.now() - 82800000).toISOString() });
  await makeOrder('in_transit', { provider_id: providerId, paid_at: new Date().toISOString() });

  console.log('\nListo. Usuarios demo (contraseña: %s):', DEMO_PASSWORD);
  console.log('  Cliente:  cliente.demo@gruafy.com');
  console.log('  Gruero:   grua.demo@gruafy.com');
  console.log('  Admin:    el email de ADMIN_EMAIL (registralo desde /registro).');
  console.log('\nEstos datos son solo para demostración; no los uses en producción.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
