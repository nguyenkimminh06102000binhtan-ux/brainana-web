"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { t } from "@/utils/t";
import { toggleVote, togglePin, deletePost, createReply, deleteReply } from "./discussion-actions";

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

interface PostCardProps {
  post: Post;
  courseId: string;
  courseSlug: string;
  currentUserId: string | null;
  creatorId: string;
  isOwner: boolean;
  labels: DiscussionLabels;
}

function CreatorBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-orange px-2 py-0.5 font-mono text-xs font-[700] uppercase tracking-wider text-on-bright">
      {label}
    </span>
  );
}

function timeAgo(iso: string, labels: DiscussionLabels): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return labels.justNow;
  if (m < 60) return t(labels.minutesAgo, { count: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t(labels.hoursAgo, { count: h });
  const d = Math.floor(h / 24);
  if (d < 30) return t(labels.daysAgo, { count: d });
  return new Date(iso).toLocaleDateString();
}

function Avatar({ profile, size = 8 }: { profile: { username: string; display_name: string | null; avatar_url: string | null } | null; size?: number }) {
  const name = profile?.display_name ?? profile?.username ?? "?";
  const cls = `relative shrink-0 overflow-hidden rounded-full bg-blue h-${size} w-${size}`;
  return (
    <div className={cls}>
      {profile?.avatar_url ? (
        <Image src={profile.avatar_url} alt={name} fill className="object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-mono text-xs font-[700] text-ocean">
          {name[0]?.toUpperCase()}
        </span>
      )}
    </div>
  );
}

function ReplyRow({ reply, courseSlug, currentUserId, creatorId, labels }: { reply: Reply; courseSlug: string; currentUserId: string | null; creatorId: string; labels: DiscussionLabels }) {
  const [pending, startTransition] = useTransition();
  const handle = reply.profiles?.username ? `@${reply.profiles.username}` : (reply.profiles?.display_name ?? "?");
  const canDelete = currentUserId === reply.profiles?.id;
  const isCreator = reply.profiles?.id === creatorId;

  return (
    <div className="flex gap-2.5">
      <Avatar profile={reply.profiles} size={7} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-manrope text-xs font-[700] text-ink">{handle}</span>
          {isCreator && <CreatorBadge label={labels.creator} />}
          <span className="font-mono text-xs text-ink-3">{timeAgo(reply.created_at, labels)}</span>
        </div>
        <p className="mt-0.5 font-manrope text-sm text-ink leading-relaxed">{reply.body}</p>
      </div>
      {canDelete && (
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => deleteReply(reply.id, courseSlug))}
          className="shrink-0 font-mono text-xs text-ink-3 hover:text-red-400 disabled:opacity-40"
        >
          {labels.delete}
        </button>
      )}
    </div>
  );
}

export default function PostCard({ post, courseId, courseSlug, currentUserId, creatorId, isOwner, labels }: PostCardProps) {
  const [pinned, setPinned] = useState(post.pinned);
  const [showReplies, setShowReplies] = useState(post.pinned);
  const [replyBody, setReplyBody] = useState("");
  const [pending, startTransition] = useTransition();

  const voted = post.course_post_votes.some((v) => v.user_id === currentUserId);
  const voteCount = post.course_post_votes.length;
  const replyCount = post.course_post_replies.length;
  const handle = post.profiles?.username ? `@${post.profiles.username}` : (post.profiles?.display_name ?? "?");
  const isAuthor = currentUserId === post.profiles?.id;
  const isPostCreator = post.profiles?.id === creatorId;

  function submitReply() {
    const trimmed = replyBody.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await createReply(post.id, courseSlug, trimmed);
      setReplyBody("");
    });
  }

  return (
    <div className={`rounded-lg border-2 p-4 ${pinned ? "border-orange/40 bg-orange/5" : "border-ink/10 bg-paper"}`}>
      {/* Pin badge */}
      {pinned && (
        <div className="mb-2 flex items-center gap-1">
          <span className="font-mono text-xs font-[700] uppercase tracking-wider text-orange-text">📌 {labels.pinned}</span>
        </div>
      )}

      {/* Post header */}
      <div className="flex items-start gap-3">
        <Avatar profile={post.profiles} size={8} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-manrope text-sm font-[800] text-ink">{handle}</span>
            {isPostCreator && <CreatorBadge label={labels.creator} />}
            <span className="font-mono text-xs text-ink-3">{timeAgo(post.created_at, labels)}</span>
            {post.edited_at && <span className="font-mono text-xs text-ink-3">{labels.edited}</span>}
          </div>
          <p className="mt-1 font-manrope text-sm text-ink leading-relaxed whitespace-pre-wrap">{post.body}</p>
        </div>
      </div>

      {/* Action row */}
      <div className="mt-3 flex items-center gap-4 pl-11">
        {/* Vote */}
        <button
          type="button"
          disabled={!currentUserId || pending}
          onClick={() => startTransition(() => toggleVote(post.id, courseSlug, voted))}
          className={`flex items-center gap-1 font-mono text-xs transition disabled:opacity-50 ${
            voted ? "text-orange-text" : "text-ink-3 hover:text-ink"
          }`}
        >
          <span>{voted ? "❤️" : "🤍"}</span>
          <span>{voteCount > 0 ? voteCount : ""}</span>
        </button>

        {/* Reply toggle */}
        <button
          type="button"
          onClick={() => setShowReplies((v) => !v)}
          className="font-mono text-xs text-ink-3 hover:text-ink transition"
        >
          💬 {replyCount > 0 ? replyCount : ""} {showReplies ? labels.hide : labels.reply}
        </button>

        {/* Pin (owner only) */}
        {isOwner && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setPinned((p) => !p);
              startTransition(() => togglePin(post.id, courseSlug, courseId, pinned));
            }}
            className={`font-mono text-xs transition disabled:opacity-40 ${pinned ? "text-orange-text" : "text-ink-3 hover:text-orange-text"}`}
          >
            {pinned ? labels.unpin : labels.pin}
          </button>
        )}

        {/* Delete (author only) */}
        {isAuthor && (
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => deletePost(post.id, courseSlug))}
            className="ml-auto font-mono text-xs text-ink-3 hover:text-red-400 transition disabled:opacity-40"
          >
            {labels.delete}
          </button>
        )}
      </div>

      {/* Replies section */}
      {showReplies && (
        <div className="mt-4 pl-11 flex flex-col gap-3">
          {post.course_post_replies.map((reply) => (
            <ReplyRow key={reply.id} reply={reply} courseSlug={courseSlug} currentUserId={currentUserId} creatorId={creatorId} labels={labels} />
          ))}

          {currentUserId && (
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitReply()}
                placeholder={labels.replyPlaceholder}
                maxLength={1000}
                className="flex-1 rounded-sm border-2 border-ink/15 bg-ink/5 px-3 py-1.5 font-manrope text-sm text-ink placeholder:text-ink-3 focus:border-orange focus:outline-none"
              />
              <button
                type="button"
                onClick={submitReply}
                disabled={!replyBody.trim() || pending}
                className="cursor-pointer rounded-full bg-ink px-4 py-1.5 font-manrope text-xs font-[800] text-on-ink transition hover:opacity-80 disabled:opacity-40"
              >
                {labels.replyButton}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
