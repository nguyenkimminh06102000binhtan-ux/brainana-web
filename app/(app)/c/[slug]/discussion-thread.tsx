import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import PostComposer from "./post-composer";
import PostCard from "./post-card";

type Reply = {
  id: string;
  body: string;
  created_at: string;
  profiles: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null;
};

type Post = {
  id: string;
  body: string;
  pinned: boolean;
  created_at: string;
  edited_at: string | null;
  profiles: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null;
  course_post_replies: Reply[];
  course_post_votes: { user_id: string }[];
};

type DiscussionLabels = {
  title: string;
  noPosts: string;
  composerPlaceholder: string;
  post: string;
  posting: string;
  creator: string;
  pinned: string;
  edited: string;
  hide: string;
  reply: string;
  pin: string;
  unpin: string;
  delete: string;
  replyPlaceholder: string;
  replyButton: string;
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;
};

interface DiscussionThreadProps {
  courseId: string;
  courseSlug: string;
  creatorId: string;
  isOwner: boolean;
  labels: DiscussionLabels;
}

export default async function DiscussionThread({ courseId, courseSlug, creatorId, isOwner, labels }: DiscussionThreadProps) {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();

  const { data: postsRaw } = await supabase
    .from("course_posts")
    .select(`
      id, body, pinned, created_at, edited_at,
      profiles!user_id (id, username, display_name, avatar_url),
      course_post_replies (
        id, body, created_at,
        profiles!user_id (id, username, display_name, avatar_url)
      ),
      course_post_votes (user_id)
    `)
    .eq("course_id", courseId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  const posts = (postsRaw ?? []) as unknown as Post[];

  return (
    <section className="rounded-lg bg-paper-2 p-6 shadow-hard">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-fredoka text-xl font-[700] tracking-tight">
          {labels.title}
          {posts.length > 0 && (
            <span className="ml-2 font-manrope text-sm font-[400] text-ink-3">
              {posts.length}
            </span>
          )}
        </h2>
      </div>

      {user && (
        <div className="mb-6">
          <PostComposer
            courseId={courseId}
            courseSlug={courseSlug}
            labels={{ composerPlaceholder: labels.composerPlaceholder, post: labels.post, posting: labels.posting }}
          />
        </div>
      )}

      {posts.length === 0 ? (
        <p className="py-4 text-center font-manrope text-sm text-ink-3">
          {labels.noPosts}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              courseId={courseId}
              courseSlug={courseSlug}
              currentUserId={user?.id ?? null}
              creatorId={creatorId}
              isOwner={isOwner}
              labels={labels}
            />
          ))}
        </div>
      )}
    </section>
  );
}
