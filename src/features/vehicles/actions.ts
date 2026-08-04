'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { vehicleSchema, type VehicleInput } from '@/features/orders/schema';

interface Result {
  ok: boolean;
  error?: string;
}

const MAX_VEHICLES = 3;

/** Agrega un vehículo del cliente (máximo 3 activos por cuenta). */
export async function addVehicle(input: VehicleInput): Promise<Result> {
  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { count } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', user.id)
    .is('deleted_at', null);
  if ((count ?? 0) >= MAX_VEHICLES) {
    return { ok: false, error: `Llegaste al máximo de ${MAX_VEHICLES} vehículos. Borrá uno para agregar otro.` };
  }

  const { error } = await supabase.from('vehicles').insert({
    client_id: user.id,
    brand: data.brand,
    model: data.model,
    year: data.year ?? null,
    patente: data.patente,
    gearbox: data.gearbox,
    gearbox_locked: data.gearbox_locked ?? null,
    has_keys: data.has_keys ?? null,
    color: data.color ?? null,
  });
  if (error) return { ok: false, error: 'No pudimos guardar el vehículo' };

  revalidatePath('/cliente/vehiculos');
  return { ok: true };
}

/** Edita un vehículo del cliente (corrige patente, marca, etc.). */
export async function editVehicle(vehicleId: string, input: VehicleInput): Promise<Result> {
  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { data: updated, error } = await supabase
    .from('vehicles')
    .update({
      brand: data.brand,
      model: data.model,
      year: data.year ?? null,
      patente: data.patente,
      gearbox: data.gearbox,
      gearbox_locked: data.gearbox_locked ?? null,
      has_keys: data.has_keys ?? null,
      color: data.color ?? null,
    })
    .eq('id', vehicleId)
    .eq('client_id', user.id)
    .is('deleted_at', null)
    .select('id');
  if (error) return { ok: false, error: 'No pudimos guardar los cambios' };
  if (!updated || updated.length === 0) return { ok: false, error: 'Vehículo no encontrado' };

  revalidatePath('/cliente/vehiculos');
  return { ok: true };
}

/**
 * Borra (soft delete) un vehículo del cliente. No lo elimina físicamente para no
 * romper las órdenes históricas que lo referencian.
 */
export async function deleteVehicle(vehicleId: string): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { data: updated, error } = await supabase
    .from('vehicles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', vehicleId)
    .eq('client_id', user.id)
    .is('deleted_at', null)
    .select('id');
  if (error) return { ok: false, error: 'No pudimos borrar el vehículo' };
  if (!updated || updated.length === 0) return { ok: false, error: 'Vehículo no encontrado' };

  revalidatePath('/cliente/vehiculos');
  return { ok: true };
}
