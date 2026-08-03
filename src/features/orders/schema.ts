import { z } from 'zod';
import { isValidPatente, normalizePatente } from '@/lib/validation/argentina';

export const vehicleSchema = z.object({
  brand: z.string().min(1, 'Ingresá la marca'),
  model: z.string().min(1, 'Ingresá el modelo'),
  // Año opcional y tolerante: si viene vacío o fuera de rango, se ignora (no bloquea el pedido).
  year: z.coerce
    .number()
    .int()
    .min(1950)
    .max(new Date().getFullYear() + 1)
    .optional()
    .catch(undefined),
  patente: z
    .string()
    .transform(normalizePatente)
    .refine(isValidPatente, 'Patente inválida (formato AAA123 o AB123CD)'),
  gearbox: z.enum(['manual', 'automatic', 'unknown']).default('unknown'),
  gearbox_locked: z.boolean().optional(),
  has_keys: z.boolean().optional(),
  color: z.string().max(30).optional(),
});
export type VehicleInput = z.infer<typeof vehicleSchema>;

const point = z.object({
  address: z.string().min(3),
  lat: z.number(),
  lng: z.number(),
});

export const createOrderSchema = z.object({
  vehicle_id: z.string().uuid().optional(),
  vehicle: vehicleSchema.optional(),
  origin: point,
  dest: point,
  distance_meters: z.number().int().positive(),
  duration_seconds: z.number().int().nonnegative(),
  dollys: z.number().int().min(0).max(4).default(0),
  wheels_blocked: z.number().int().min(0).max(4).default(0),
  conditions: z
    .object({
      public_road: z.boolean().default(true),
      vehicle_type: z.enum(['auto', 'moto']).optional(),
      wheels_unsure: z.boolean().optional(),
      notes: z.string().max(500).optional(),
    })
    .default({ public_road: true }),
  accepted_terms: z.literal(true, { errorMap: () => ({ message: 'Tenés que aceptar los términos' }) }),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
