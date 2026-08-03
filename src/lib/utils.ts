import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Espera `ms` milisegundos. Útil en reintentos con backoff. */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
