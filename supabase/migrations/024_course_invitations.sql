-- ── Course invitations ────────────────────────────────────────────────────────
-- Allows course owners to invite specific users to private courses.

create table course_invitations (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references courses(id) on delete cascade,
  invited_by    uuid not null references profiles(id) on delete cascade,
  invited_email text not null,
  status        text not null default 'pending'
                check (status in ('pending', 'accepted', 'declined', 'expired')),
  token         text not null unique default encode(gen_random_bytes(32), 'hex'),
  expires_at    timestamptz not null default (now() + interval '7 days'),
  created_at    timestamptz not null default now(),
  unique (course_id, invited_email)
);

create index on course_invitations (token);
create index on course_invitations (course_id);
create index on course_invitations (invited_email);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table course_invitations enable row level security;

-- Course owners can view and manage invitations for their courses
create policy "course_owners_manage_invitations"
  on course_invitations for all
  to authenticated
  using (
    exists (
      select 1 from courses
      where courses.id = course_invitations.course_id
        and courses.creator_id = auth.uid()
    )
  );

-- Invited users can view their own invitations via email match
create policy "invited_users_view_own_invitations"
  on course_invitations for select
  to authenticated
  using (
    invited_email = (
      select email from auth.users where id = auth.uid()
    )
  );

-- Invited users can update status (accept/decline) on their own invitations
create policy "invited_users_update_own_invitations"
  on course_invitations for update
  to authenticated
  using (
    invited_email = (
      select email from auth.users where id = auth.uid()
    )
  )
  with check (
    status in ('accepted', 'declined')
  );
