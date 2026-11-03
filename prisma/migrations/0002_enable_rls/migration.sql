-- Segurança no Supabase: a API REST (chave publishable/anon) só enxerga tabelas
-- sem RLS. Ativamos RLS em todas, sem nenhuma policy: anon/authenticated ficam
-- sem acesso. O Prisma conecta como dono das tabelas (role postgres) e ignora RLS.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;
