import type { Metadata } from 'next';
import { LegalHeader } from '@/components/brand/legal-shell';
import { publicEnv } from '@/lib/env';

export const metadata: Metadata = { title: 'Términos y condiciones — clientes' };

export default function TerminosClientes() {
  return (
    <>
      <LegalHeader title="Términos y condiciones — clientes" updated="agosto 2026" />

      <h2>1. Qué es gruafy</h2>
      <p>
        gruafy es una plataforma tecnológica que conecta a personas que necesitan un acarreo con grúa
        (el «cliente») con proveedores independientes de grúas (el «gruero»). gruafy actúa como
        <strong> intermediario tecnológico</strong>: no presta directamente el servicio de remolque ni
        emplea a los grueros.
      </p>

      <h2>2. Aceptación</h2>
      <p>
        Al registrarte y al confirmar una solicitud aceptás estos términos. Guardamos la versión y el
        momento de tu aceptación. Si no estás de acuerdo, no uses la plataforma.
      </p>

      <h2>3. Cómo funciona el servicio</h2>
      <p>
        Cargás los datos de tu vehículo, el origen y el destino, y ves un presupuesto estimado antes de
        confirmar. Primero un gruero acepta el viaje; recién entonces se te solicita el pago del
        anticipo de gruafy.
      </p>

      <h2>4. Precios y pagos</h2>
      <p>
        gruafy cobra por adelantado, a través de Mercado Pago, una comisión equivalente al 20% del
        subtotal estimado del servicio, más el costo de procesamiento de pago y sus impuestos. Ese
        importe reserva la grúa.
      </p>
      <p>
        El <strong>saldo del servicio</strong> (la base del gruero, su IVA y los adicionales) se abona
        <strong> directamente al gruero</strong> al finalizar, en efectivo, transferencia u otro medio
        acordado entre las partes, por fuera de gruafy.
      </p>
      <p>
        El presupuesto base es fijo respecto de lo que declarás. Pueden sumarse adicionales solo por
        situaciones avisadas de antemano (peajes, espera, dollys no informados, ruedas bloqueadas,
        condición distinta del vehículo o acceso especial), con su motivo. Los adicionales están
        acotados a un catálogo con topes de precio y cantidad definidos por gruafy: el gruero no puede
        cobrar montos fuera de esos límites, y los que superen ciertos topes quedan sujetos a revisión.
        Todos los adicionales aprobados se reflejan en el total a pagar al finalizar.
      </p>

      <h2>5. Comprobantes</h2>
      <p>
        gruafy pone a tu disposición un comprobante/resumen de la operación. Ese documento no
        constituye una factura fiscal salvo que se emita expresamente como tal.
      </p>

      <h2>6. Cancelaciones y reembolsos</h2>
      <p>
        Podés cancelar antes de que la grúa inicie el recorrido. Los reembolsos del anticipo se evalúan
        caso por caso y se procesan a través de Mercado Pago.
      </p>

      <h2>7. Responsabilidad y seguridad</h2>
      <p>
        El gruero es responsable de la ejecución del servicio. gruafy no responde por fallas mecánicas
        preexistentes, demoras ajenas a la plataforma ni daños derivados de la operación. Viajan como
        máximo <strong>dos personas</strong> junto al vehículo; si sos más, coordiná otro transporte
        antes de que llegue la grúa. El gruero no puede dejar personas en la vía pública (no está
        permitido el abandono de persona). Ante una emergencia, usá el botón para llamar al 911.
      </p>

      <h2>8. Datos personales y fotos</h2>
      <p>
        El tratamiento de tus datos se rige por nuestra Política de Privacidad. Antes del pago, el
        gruero no accede a tu ubicación exacta ni a tu contacto; se revelan al confirmarse el pago para
        poder prestar el servicio. Al pedir, subís una foto de la situación del vehículo (tomada en el
        momento) que el gruero puede ver para evaluar el servicio; declarás que es veraz y actual.
      </p>

      <h2>9. Ley y jurisdicción</h2>
      <p>
        Estos términos se rigen por las leyes de la República Argentina. Ante cualquier conflicto
        intervienen los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires.
      </p>

      <h2>10. Contacto</h2>
      <p>
        {publicEnv.legal.email || publicEnv.supportEmail
          ? `Escribinos a ${publicEnv.legal.email || publicEnv.supportEmail}.`
          : 'Podés contactarnos por los canales de contacto disponibles en la plataforma.'}
      </p>
    </>
  );
}
