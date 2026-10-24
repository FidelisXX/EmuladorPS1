-- Rode uma vez no Supabase: Dashboard > SQL Editor > New query > cole e clique em Run.
-- Cria o bucket privado "saves" e as regras (RLS) para cada usuário acessar só a própria pasta: <id do usuário>/...

insert into storage.buckets (id, name, public, file_size_limit)
values ('saves', 'saves', false, 20971520) -- 20 MB por arquivo
on conflict (id) do nothing;

create policy "saves: ler os próprios"
  on storage.objects for select to authenticated
  using (bucket_id = 'saves' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "saves: criar os próprios"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'saves' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "saves: atualizar os próprios"
  on storage.objects for update to authenticated
  using (bucket_id = 'saves' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'saves' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "saves: excluir os próprios"
  on storage.objects for delete to authenticated
  using (bucket_id = 'saves' and (storage.foldername(name))[1] = auth.uid()::text);
