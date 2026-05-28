-- Course discussion: top-level posts
create table course_posts (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references courses(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  pinned     boolean not null default false,
  created_at timestamptz not null default now(),
  edited_at  timestamptz
);

create index course_posts_course_id_idx on course_posts (course_id, created_at desc);

-- Replies to posts (one level deep)
create table course_post_replies (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references course_posts(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index course_post_replies_post_id_idx on course_post_replies (post_id, created_at asc);

-- Upvotes on posts
create table course_post_votes (
  post_id    uuid not null references course_posts(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ── RLS ────────────────────────────────────────────────────────────────────

alter table course_posts        enable row level security;
alter table course_post_replies enable row level security;
alter table course_post_votes   enable row level security;

-- course_posts: anyone authenticated can read; authors can insert/update/delete
create policy "course_posts_select" on course_posts for select to authenticated using (true);
create policy "course_posts_insert" on course_posts for insert to authenticated with check (auth.uid() = user_id);
create policy "course_posts_update" on course_posts for update to authenticated using (auth.uid() = user_id);
create policy "course_posts_delete" on course_posts for delete to authenticated using (auth.uid() = user_id);

-- course_post_replies
create policy "replies_select" on course_post_replies for select to authenticated using (true);
create policy "replies_insert" on course_post_replies for insert to authenticated with check (auth.uid() = user_id);
create policy "replies_delete" on course_post_replies for delete to authenticated using (auth.uid() = user_id);

-- course_post_votes
create policy "votes_select" on course_post_votes for select to authenticated using (true);
create policy "votes_insert" on course_post_votes for insert to authenticated with check (auth.uid() = user_id);
create policy "votes_delete" on course_post_votes for delete to authenticated using (auth.uid() = user_id);
