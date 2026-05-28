import Image from "next/image";
import Link from "next/link";

const LEVEL_HEADER: Record<string, string> = {
  beginner: "bg-green-soft",
  intermediate: "bg-yellow-soft",
  advanced: "bg-red-soft",
};
const LEVEL_DOT: Record<string, string> = {
  beginner: "#4ade80",
  intermediate: "#fbbf24",
  advanced: "#f97316",
};
const STRIPE = {
  backgroundImage:
    "repeating-linear-gradient(-45deg,transparent,transparent 8px,rgba(0,0,0,0.04) 8px,rgba(0,0,0,0.04) 9px)",
};

export type EnrolledCourseCardData = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  cover_image_url: string | null;
  level: string | null;
  card_count: number;
  masteredCount: number;
  dueCount: number;
  hasStudied: boolean;
};

export default function EnrolledCourseCard({ course }: { course: EnrolledCourseCardData }) {
  const pct = course.card_count > 0
    ? Math.round((course.masteredCount / course.card_count) * 100)
    : 0;
  const headerBg = LEVEL_HEADER[course.level ?? ""] ?? "bg-blue/20";
  const dotColor = LEVEL_DOT[course.level ?? ""] ?? "#93c5fd";

  return (
    <div className="overflow-hidden rounded-xl bg-paper-2 shadow-hard transition hover:-translate-y-0.5">
      <Link
        href={`/c/${course.slug}`}
        className={`relative flex h-20 items-end px-4 pb-3 ${headerBg} block`}
        style={STRIPE}
      >
        {course.cover_image_url ? (
          <Image src={course.cover_image_url} alt={course.title} fill className="object-cover" />
        ) : (
          <span className="relative z-10 font-mono text-xs uppercase tracking-widest text-ink/50">
            [{course.category?.toLowerCase() ?? "course"}{course.level ? ` · ${course.level}` : ""}]
          </span>
        )}
        <span
          className="absolute right-3 top-3 z-10 h-3 w-3 rounded-full border-2 border-paper-2"
          style={{ backgroundColor: dotColor }}
        />
      </Link>

      <div className="flex flex-col gap-2 p-4">
        <div>
          <Link
            href={`/c/${course.slug}`}
            className="font-fredoka text-lg font-[700] leading-tight tracking-tight hover:text-orange"
          >
            {course.title}
          </Link>
          <p className="font-mono text-xs text-ink-2">{course.card_count} cards</p>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between font-mono text-xs text-ink-2">
            <span>{course.masteredCount}/{course.card_count} mastered</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper">
            <div className="h-full rounded-full bg-orange transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          {!course.hasStudied ? (
            <span className="font-mono text-xs text-ink-3">not started</span>
          ) : course.dueCount > 0 ? (
            <span className="rounded-full bg-orange/10 px-2.5 py-0.5 font-mono text-xs font-[700] text-orange">
              {course.dueCount} due
            </span>
          ) : (
            <span className="font-mono text-xs text-ink-3">Up to date ✓</span>
          )}
          <Link
            href={`/study/${course.slug}`}
            className="rounded-full bg-orange px-4 py-1.5 font-manrope text-sm font-[800] text-white shadow-hard-sm transition hover:opacity-90 active:translate-y-[1px]"
          >
            Study →
          </Link>
        </div>
      </div>
    </div>
  );
}
