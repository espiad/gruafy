import Link from 'next/link';

const DOCS = [
  { href: '/legal/terminos-clientes', label: 'Términos — clientes' },
  { href: '/legal/terminos-proveedores', label: 'Términos — proveedores' },
  { href: '/legal/privacidad', label: 'Privacidad' },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container grid gap-10 py-14 lg:grid-cols-[220px_1fr]">
      <nav className="h-fit lg:sticky lg:top-24">
        <ul className="space-y-1">
          {DOCS.map((d) => (
            <li key={d.href}>
              <Link href={d.href} className="focus-ring block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
                {d.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <article className="prose-legal max-w-2xl space-y-4 text-sm leading-relaxed [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-lg [&_h3]:mt-4 [&_h3]:font-semibold [&_p]:text-foreground/90">
        {children}
      </article>
    </div>
  );
}
