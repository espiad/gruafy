import type { Metadata } from 'next';
import { LegalHeader } from '@/components/brand/legal-shell';
import { publicEnv } from '@/lib/env';

export const metadata: Metadata = { title: 'Términos y condiciones — proveedores' };

export default function TerminosProveedores() {
  return (
    <>
      <LegalHeader title="Términos y condiciones — proveedores" updated="agosto 2026" />

      <h2>1. Objeto</h2>
      <p>
        Regula la relación entre gruafy y los proveedores de grúas («grueros») que ofrecen servicios de
        acarreo a través de la plataforma. gruafy actúa como intermediario tecnológico y no es empleador
        del gruero.
      </p>

      <h2>2. Alta y habilitación</h2>
      <p>
        Para operar, el proveedor completa el alta cargando datos de la empresa (razón social, CUIT,
        seguro, habilitaciones), de la grúa (patente, VTV, seguro vigente, documentación técnica) y de
        cada conductor (nombre, DNI, licencia, LiNTI cuando corresponda). Un administrador de gruafy
        revisa y aprueba manualmente la documentación. Una cuenta equivale a una grúa habilitada, con
        hasta cinco conductores.
      </p>

      <h2>3. Obligaciones del proveedor</h2>
      <p>
        Mantener la documentación vigente, prestar el servicio con profesionalismo, no delegar en
        terceros no habilitados, cumplir la normativa aplicable y compartir su ubicación durante el
        servicio mientras la aplicación esté activa.
      </p>

      <h2>4. Cobros y comisión</h2>
      <p>
        gruafy percibe una comisión equivalente al 20% del subtotal estimado del servicio, que se cobra
        al cliente por adelantado a modo de anticipo de reserva. El resto del servicio (base del gruero,
        IVA y adicionales) lo <strong>cobra el gruero directamente al cliente</strong> al finalizar, por
        el medio que acuerden. gruafy no asume obligaciones laborales ni previsionales respecto del
        gruero.
      </p>

      <h2>5. Adicionales</h2>
      <p>
        Los adicionales (peajes, espera, etc.) requieren motivo y, cuando corresponda, evidencia.
        Importes que superen los topes configurados quedan sujetos a revisión de gruafy.
      </p>

      <h2>6. Responsabilidad</h2>
      <p>
        El proveedor asume plena responsabilidad por la ejecución del servicio y por los daños que de él
        deriven. gruafy no responde por hechos u omisiones del proveedor.
      </p>

      <h2>7. Suspensión y baja</h2>
      <p>
        gruafy puede suspender o dar de baja una cuenta por documentación vencida, incumplimientos o
        calificaciones negativas. El proveedor puede darse de baja voluntariamente con preaviso.
      </p>

      <h2>8. Datos y confidencialidad</h2>
      <p>
        La información del cliente obtenida para prestar el servicio es confidencial y solo puede usarse
        para esa finalidad. El tratamiento de datos se rige por la Política de Privacidad.
      </p>

      <h2>9. Ley y jurisdicción</h2>
      <p>
        Se aplican las leyes de la República Argentina. Jurisdicción: tribunales ordinarios de la Ciudad
        Autónoma de Buenos Aires.
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
