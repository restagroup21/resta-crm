-- =====================================================================
-- リスタCRM：職員ログインとアクセス制限（RLS）
--
-- 実行方法：Supabase の「SQL Editor」にこのファイルの中身を全部貼り付けて「Run」
-- 何度実行しても問題ないように書いています。
--
-- しくみ：
--   ・staff_members に登録されたメールアドレスでログインした人だけが
--     相談者・対応履歴・入寮者のデータを見たり書いたりできる
--   ・ログインしていない人（画面の鍵だけ持っている人）は何も見られない
-- =====================================================================

-- 1. 職員名簿
create table if not exists public.staff_members (
  email text primary key,
  name text,
  created_at timestamptz not null default now()
);

-- ★ ここに職員のメールアドレスを登録（Authentication でユーザーを作るのと同じアドレス）
--   人を増やすときは、この insert 文を1行ずつ足して実行してください
insert into public.staff_members (email, name) values
  ('restagroup.21@gmail.com', '管理者')
on conflict (email) do nothing;

-- 2. 「ログイン中の人が職員かどうか」を判定する関数
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_members
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

-- 3. RLS（行レベルのアクセス制限）をオンにする
alter table public.staff_members enable row level security;
alter table public.consultants   enable row level security;
alter table public.contact_logs  enable row level security;
alter table public.residents     enable row level security;

-- 4. 職員だけが読み書きできるルール
drop policy if exists "staff can read staff list" on public.staff_members;
create policy "staff can read staff list" on public.staff_members
  for select to authenticated using (public.is_staff());

drop policy if exists "staff full access" on public.consultants;
create policy "staff full access" on public.consultants
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff full access" on public.contact_logs;
create policy "staff full access" on public.contact_logs
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff full access" on public.residents;
create policy "staff full access" on public.residents
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- 確認用：下の結果で4つとも rowsecurity が true になっていればOK
select tablename, rowsecurity from pg_tables
where schemaname = 'public'
  and tablename in ('staff_members', 'consultants', 'contact_logs', 'residents');
