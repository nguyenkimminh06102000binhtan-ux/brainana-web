-- Temporary upload bucket for large files (PDFs, DOCX, etc.)
-- Files are uploaded here before server-side processing and deleted immediately after.

insert into storage.buckets (id, name, public, file_size_limit)
values ('temp-uploads', 'temp-uploads', false, 20971520) -- 20 MB
on conflict (id) do nothing;

-- Users can upload their own temp files
create policy "temp_uploads_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'temp-uploads' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read their own temp files (server uses user session to download)
create policy "temp_uploads_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'temp-uploads' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own temp files
create policy "temp_uploads_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'temp-uploads' and
    (storage.foldername(name))[1] = auth.uid()::text
  );
