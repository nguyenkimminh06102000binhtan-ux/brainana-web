import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

type CourseCard = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  cover_image_url: string | null;
  level: string | null;
  card_count: number;
  learner_count: number;
  rating: number;
  has_audio: boolean;
  mems_count: number;
  is_published: boolean;
  visibility: string;
};

type EnrolledCourse = CourseCard & {
  completed_items: number;
  last_studied_at: string | null;
};

const LEVEL_HEADER: Record<string, string> = {
  beginner:     "bg-green-soft",
  intermediate: "bg-yellow-soft",
  advanced:     "bg-red-soft",
};
const LEVEL_DOT: Record<string, string> = {
  beginner:     "#4ade80",
  intermediate: "#fbbf24",
  advanced:     "#f97316",
};
const STRIPE = {
  backgroundImage:
    "repeating-linear-gradient(-45deg,transparent,transparent 8px,rgba(0,0,0,0.04) 8px,rgba(0,0,0,0.04) 9px)",
};

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default async function LibraryPage() {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: createdRaw },
    { data: enrolledRaw },
  ] = await Promise.all([
    supabase
      .from("courses")
      .select("id, slug, title, category, cover_image_url, level, card_count, learner_count, rating, has_audio, mems_count, is_published, visibility")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("user_courses")
      .select("completed_items, last_studied_at, courses!course_id (id, slug, title, category, cover_image_url, level, card_count, learner_count, rating, has_audio, mems_count, is_published, visibility, creator_id)")
      .eq("user_id", user.id)
      .order("last_studied_at", { ascending: false, nullsFirst: false }),
  ]);

  const created = (createdRaw ?? []) as CourseCard[];

  const allEnrolled = ((enrolledRaw ?? []) as unknown as {
    completed_items: number;
    last_studied_at: string | null;
    courses: CourseCard & { creator_id: string };
  }[])
    .filter((row) => row.courses.creator_id !== user.id) // own courses live in My Courses only
    .map((row) => ({
      ...row.courses,
      completed_items: row.completed_items,
      last_studied_at: row.last_studied_at,
    })) as EnrolledCourse[];

  const learning = allEnrolled.filter((c) => c.last_studied_at !== null);
  const saved    = allEnrolled.filter((c) => c.last_studied_at === null);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-10">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Library</p>
        <h1 className="mt-1 font-fredoka text-4xl font-[700] tracking-tight">
          Your <span className="text-orange">courses</span>
        </h1>
      </div>

      <Section title="My Courses" count={created.length} emptyText="You haven't created any courses yet." emptyLink={{ href: "/create", label: "Create a course" }}>
        {created.map((course) => (
          <CreatedCard key={course.id} course={course} />
        ))}
      </Section>

      <Section title="Learning" count={learning.length} emptyText="You haven't studied any course yet.">
        {learning.map((course) => (
          <EnrolledCard key={course.id} course={course} />
        ))}
      </Section>

      <Section title="Saved" count={saved.length} emptyText="No saved courses yet. Browse to find one!" emptyLink={{ href: "/browse", label: "Browse courses" }}>
        {saved.map((course) => (
          <EnrolledCard key={course.id} course={course} />
        ))}
      </Section>
    </div>
  );
}

function Section({
  title, count, children, emptyText, emptyLink,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  emptyText: string;
  emptyLink?: { href: string; label: string };
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="font-fredoka text-2xl font-[700] tracking-tight">{title}</h2>
        <span className="rounded-full bg-paper-2 px-3 py-0.5 font-mono text-xs font-[700] text-ink-2 shadow-hard-sm">
          {count}
        </span>
      </div>

      {count === 0 ? (
        <div className="flex items-center gap-4 rounded-xl bg-paper-2 px-6 py-5 shadow-hard-sm">
          <p className="font-manrope text-sm text-ink-2">{emptyText}</p>
          {emptyLink && (
            <Link
              href={emptyLink.href}
              className="ml-auto shrink-0 rounded-full bg-orange px-4 py-2 font-manrope text-sm font-[800] text-white shadow-hard-sm transition hover:opacity-90 active:translate-y-[1px]"
            >
              {emptyLink.label} →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children}
        </div>
      )}
    </section>
  );
}

function CourseCardShell({ course, children }: { course: CourseCard; children: React.ReactNode }) {
  const headerBg = LEVEL_HEADER[course.level ?? ""] ?? "bg-blue/20";
  const dotColor = LEVEL_DOT[course.level ?? ""] ?? "#93c5fd";

  return (
    <div className="group overflow-hidden rounded-xl bg-paper-2 shadow-hard transition hover:-translate-y-0.5">
      {/* Clickable header → course detail */}
      <Link href={`/c/${course.slug}`} className={`relative flex h-20 items-end px-4 pb-3 ${headerBg} block`} style={STRIPE}>
        {course.cover_image_url ? (
          <Image src={course.cover_image_url} alt={course.title} fill className="object-cover" />
        ) : (
          <span className="relative z-10 font-mono text-xs uppercase tracking-widest text-ink/50">
            [{" "}{[course.category?.toLowerCase(), course.level].filter(Boolean).join(" · ")}{" "}]
          </span>
        )}
        <span
          className="absolute right-3 top-3 z-10 h-3 w-3 rounded-full border-2 border-paper-2"
          style={{ backgroundColor: dotColor }}
        />
        {!course.is_published && (
          <span className="absolute left-3 top-2.5 z-10 rounded-full bg-paper/90 px-2 py-0.5 font-mono text-[10px] font-[700] uppercase tracking-wider text-ink-2">
            draft
          </span>
        )}
        {course.visibility !== "public" && course.is_published && (
          <span className="absolute left-3 top-2.5 z-10 rounded-full bg-paper/90 px-2 py-0.5 font-mono text-[10px] font-[700] uppercase tracking-wider text-ink-2">
            {course.visibility}
          </span>
        )}
      </Link>

      <div className="flex flex-col gap-2 p-4">
        <div>
          <Link href={`/c/${course.slug}`} className="font-fredoka text-lg font-[700] leading-tight tracking-tight hover:text-orange">
            {course.title}
          </Link>
          <p className="font-mono text-xs text-ink-2">{course.card_count} cards</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function CreatedCard({ course }: { course: CourseCard }) {
  return (
    <CourseCardShell course={course}>
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {course.has_audio && (
            <span className="rounded-full border border-ink/15 px-2 py-0.5 font-mono text-xs text-ink-2">audio</span>
          )}
          {course.mems_count > 0 && (
            <span className="rounded-full border border-ink/15 px-2 py-0.5 font-mono text-xs text-ink-2">mems</span>
          )}
        </div>
        <span className="font-mono text-xs text-ink-2">👥 {fmt(course.learner_count)}</span>
      </div>
      <div className="mt-1 flex gap-2">
        <Link
          href={`/study/${course.slug}`}
          className="flex-1 rounded-full bg-orange px-4 py-1.5 text-center font-manrope text-sm font-[800] text-white shadow-hard-sm transition hover:opacity-90 active:translate-y-[1px]"
        >
          Study →
        </Link>
        <Link
          href={`/c/${course.slug}/edit`}
          className="rounded-full bg-paper px-4 py-1.5 font-manrope text-sm font-[700] text-ink shadow-hard-sm transition hover:bg-orange hover:text-white active:translate-y-[1px]"
        >
          Edit
        </Link>
      </div>
    </CourseCardShell>
  );
}

function EnrolledCard({ course }: { course: EnrolledCourse }) {
  const pct = course.card_count > 0
    ? Math.round((course.completed_items / course.card_count) * 100)
    : 0;

  return (
    <CourseCardShell course={course}>
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between font-mono text-xs text-ink-2">
          <span>{course.completed_items}/{course.card_count} cards</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper">
          <div className="h-full rounded-full bg-orange transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        {course.last_studied_at ? (
          <span className="font-mono text-xs text-ink-2">studied {timeAgo(course.last_studied_at)}</span>
        ) : (
          <span className="font-mono text-xs text-ink-2">not started</span>
        )}
        <Link
          href={`/study/${course.slug}`}
          className="rounded-full bg-orange px-4 py-1.5 font-manrope text-sm font-[800] text-white shadow-hard-sm transition hover:opacity-90 active:translate-y-[1px]"
        >
          Study →
        </Link>
      </div>
    </CourseCardShell>
  );
}
