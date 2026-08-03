-- =============================================================================
-- gruafy — Storage privado para documentación de proveedores
-- Bucket privado; los archivos se sirven solo por URL firmada de corta duración.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- El proveedor sube/lee bajo su carpeta: documents/<provider_id>/...
-- Convención: el primer segmento del path es el provider_id del dueño.
create policy "docs_provider_read"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and (
      is_admin()
      or exists (
        select 1 from provider_accounts pa
        where pa.id::text = (storage.foldername(name))[1]
          and (pa.owner_id = auth.uid())
      )
    )
  );

create policy "docs_provider_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and exists (
      select 1 from provider_accounts pa
      where pa.id::text = (storage.foldername(name))[1]
        and pa.owner_id = auth.uid()
    )
  );

create policy "docs_provider_delete"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from provider_accounts pa
      where pa.id::text = (storage.foldername(name))[1]
        and pa.owner_id = auth.uid()
    )
  );
