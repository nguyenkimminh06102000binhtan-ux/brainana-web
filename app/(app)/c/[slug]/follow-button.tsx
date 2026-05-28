"use client";

import { useOptimistic, useTransition } from "react";
import { toggleFollow } from "./actions";

export default function FollowButton({
  isFollowing,
  creatorId,
  slug,
  labels,
}: {
  isFollowing: boolean;
  creatorId: string;
  slug: string;
  labels: { following: string; follow: string };
}) {
  const [optimisticFollowing, setOptimisticFollowing] = useOptimistic(isFollowing);
  const [, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      setOptimisticFollowing(!optimisticFollowing);
      await toggleFollow(formData);
    });
  }

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="creator_id" value={creatorId} />
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        className={`w-full rounded-full px-5 py-2.5 font-manrope text-sm font-[800] shadow-hard-sm transition active:translate-y-[1px] active:shadow-none ${
          optimisticFollowing
            ? "bg-green-soft text-ink hover:bg-red-soft hover:text-orange"
            : "bg-paper text-ink hover:bg-orange hover:text-white"
        }`}
      >
        {optimisticFollowing ? labels.following : labels.follow}
      </button>
    </form>
  );
}
