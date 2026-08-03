import type { Metadata } from 'next';
import { LegalHeader } from '@/components/brand/legal-shell';
import { publicEnv } from '@/lib/env';

export const metadata: Metadata = { title: 'Política de privacidad' };

export default function Privacidad() {
  return (
    <>
      <LegalHeader title="Política de privacidad" updated="agosto 2026" />

      <h2>1. Responsable</h2>
      <p>
        {publicEnv.legal.name} («gruafy») es responsable del tratamiento de los datos personales que
        recolecta a través de la plataforma, conforme a la Ley 25.326 de Protección de Datos Personales.
      </p>

      <h2>2. Qué datos recolectamos</h2>
      <p>
        Datos identificatorios (nombre, DNI, contacto), datos del vehículo y de la grúa, documentación
        de respaldo de proveedores, datos de ubicación durante el servicio y datos técnicos de uso. Los
        pagos se procesan a través de Mercado Pago; gruafy no almacena datos de tarjetas.
      </p>

      <h2>3. Para qué los usamos</h2>
      <p>
        Para registrar y autenticar cuentas, gestionar solicitudes y asignaciones, calcular precios,
        habilitar el seguimiento en vivo, prevenir fraudes, cumplir obligaciones legales y enviarte
        notificaciones del servicio.
      </p>

      <h2>4. Geolocalización</h2>
      <p>
        Usamos tu ubicación para calcular rutas y mostrar el seguimiento en tiempo real. La ubicación del
        gruero se comparte mientras la aplicación está activa durante un servicio. No prometemos
        seguimiento en segundo plano cuando el navegador no lo garantiza.
      </p>

      <h2>5. Documentos y almacenamiento</h2>
      <p>
        La documentación de los proveedores se guarda en almacenamiento privado y se accede solo mediante
        enlaces firmados de corta duración. Aplicamos medidas técnicas razonables de seguridad.
      </p>

      <h2>6. Terceros</h2>
      <p>
        Compartimos datos únicamente con los proveedores necesarios para prestar el servicio (por
        ejemplo, procesamiento de pagos y mapas) y cuando una obligación legal lo exige. Antes del pago
        no se cruzan datos privados entre cliente y proveedor.
      </p>

      <h2>7. Conservación</h2>
      <p>
        Conservamos los datos mientras la cuenta esté activa o exista una obligación legal; luego se
        eliminan o anonimizan.
      </p>

      <h2>8. Tus derechos</h2>
      <p>
        Podés ejercer tus derechos de acceso, rectificación, actualización y supresión{' '}
        {publicEnv.legal.email ? `escribiendo a ${publicEnv.legal.email}` : 'a través de los canales de contacto de la plataforma'}
        . La Agencia de Acceso a la Información Pública es el órgano de control.
      </p>

      <h2>9. Cambios</h2>
      <p>Podemos actualizar esta política; publicaremos los cambios en la plataforma.</p>
    </>
  );
}
