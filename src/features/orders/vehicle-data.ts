/** Datos de ayuda para cargar el vehículo sin fricción. */

export type VehicleType = 'auto' | 'moto';

/** Marcas más comunes en Argentina, para autocompletar sin escribir todo. */
export const CAR_BRANDS = [
  'Volkswagen',
  'Toyota',
  'Chevrolet',
  'Ford',
  'Renault',
  'Fiat',
  'Peugeot',
  'Citroën',
  'Nissan',
  'Honda',
  'Jeep',
  'Hyundai',
  'Mercedes-Benz',
  'BMW',
  'Audi',
  'Kia',
  'Chery',
  'Volvo',
];

export const MOTO_BRANDS = [
  'Honda',
  'Yamaha',
  'Zanella',
  'Motomel',
  'Corven',
  'Gilera',
  'Bajaj',
  'Keller',
  'Suzuki',
  'Kawasaki',
  'Guerrero',
  'Benelli',
  'KTM',
];

export function brandsFor(type: VehicleType): string[] {
  return type === 'moto' ? MOTO_BRANDS : CAR_BRANDS;
}
