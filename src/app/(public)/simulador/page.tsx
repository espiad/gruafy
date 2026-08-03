import type { Metadata } from 'next';
import { SimuladorForm } from './simulador-form';

export const metadata: Metadata = {
  title: 'Simulá tu costo',
  description: 'Calculá cuánto te sale un acarreo con grúa. Desglose claro de lo que pagás ahora y lo que pagás después.',
};

export default function SimuladorPage() {
  return (
    <div className="container py-14">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h1 className="font-display text-3xl md:text-4xl">Simulá tu costo</h1>
        <p className="mt-3 text-muted-foreground">
          Ingresá origen y destino y mirá el desglose. Sin registrarte y sin compromiso. Primero una
          grúa acepta; recién después pagás el anticipo por Mercado Pago.
        </p>
      </div>
      <SimuladorForm />
    </div>
  );
}
