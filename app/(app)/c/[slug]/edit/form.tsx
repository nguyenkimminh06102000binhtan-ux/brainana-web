"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { updateCourse } from "./actions";
import { createClient } from "@/utils/supabase/client";
import { compressImage } from "@/utils/compress-image";
import { TOP_LEVEL_CATEGORIES, getCategoryItems, getCategoryForItem } from "@/app/constants/categories";
const LANGUAGES = ["English", "Vietnamese", "Japanese", "Korean", "Chinese", "Spanish", "French", "German", "Portuguese", "Arabic", "Other"];

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm"];
const IMAGE_MAX = 5 * 1024 * 1024;
const AUDIO_MAX = 10 * 1024 * 1024;

type UploadState = { uploading: boolean; compressing: boolean; error: string | null };
type UploadField = "image" | "frontAudio" | "backAudio";

type Item = {
  id: number;
  dbId: string | null;
  front: string;
  back: string;
  imageUrl: string;
  frontAudioUrl: string;
  backAudioUrl: string;
  uploads: Record<UploadField, UploadState>;
};

type Section = {
  id: number;
  dbId: string | null;
  title: string;
  description: string;
  items: Item[];
};

type DbSection = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  items: {
    id: string;
    front_text: string;
    back_text: string;
    image_url: string | null;
    front_audio_url: string | null;
    back_audio_url: string | null;
    position: number;
  }[];
};

type Course = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  source_language: string | null;
  target_language: string | null;
  visibility: string;
  level: string | null;
};

let uid = 1;
const freshUpload = (): Record<UploadField, UploadState> => ({
  image: { uploading: false, compressing: false, error: null },
  frontAudio: { uploading: false, compressing: false, error: null },
  backAudio: { uploading: false, compressing: false, error: null },
});
const makeItem = (): Item => ({ id: uid++, dbId: null, front: "", back: "", imageUrl: "", frontAudioUrl: "", backAudioUrl: "", uploads: freshUpload() });
const makeSection = (): Section => ({ id: uid++, dbId: null, title: "", description: "", items: [makeItem()] });

function fromDb(dbSections: DbSection[]): Section[] {
  return dbSections.map((s) => ({
    id: uid++,
    dbId: s.id,
    title: s.title,
    description: s.description ?? "",
    items: s.items.length > 0
      ? s.items.map((i) => ({
          id: uid++,
          dbId: i.id,
          front: i.front_text,
          back: i.back_text,
          imageUrl: i.image_url ?? "",
          frontAudioUrl: i.front_audio_url ?? "",
          backAudioUrl: i.back_audio_url ?? "",
          uploads: freshUpload(),
        }))
      : [makeItem()],
  }));
}

function parseCsv(text: string): Array<[string, string]> {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const results: Array<[string, string]> = [];

  function parseRow(line: string): string[] {
    const cols: string[] = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        let val = "";
        i++;
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { val += '"'; i += 2; }
          else if (line[i] === '"') { i++; break; }
          else { val += line[i++]; }
        }
        cols.push(val);
        if (line[i] === ",") i++;
      } else {
        const end = line.indexOf(",", i);
        if (end === -1) { cols.push(line.slice(i)); break; }
        else { cols.push(line.slice(i, end)); i = end + 1; }
      }
    }
    return cols;
  }

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = parseRow(line);
    const front = cols[0]?.trim() ?? "";
    const back = cols[1]?.trim() ?? "";
    if (front && back) results.push([front, back]);
  }
  return results;
}

async function uploadToStorage(file: File): Promise<string> {
  const isImage = IMAGE_TYPES.includes(file.type);
  const isAudio = AUDIO_TYPES.includes(file.type);
  if (!isImage && !isAudio) throw new Error("Unsupported file type.");
  if (isAudio && file.size > AUDIO_MAX) throw new Error("Audio must be under 10 MB.");

  const fileToUpload = isImage ? await compressImage(file, IMAGE_MAX) : file;
  const supabase = createClient();
  const ext = fileToUpload.name.split(".").pop();
  const path = `items/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage.from("course-media").upload(path, fileToUpload, { contentType: fileToUpload.type });
  if (error) throw new Error(error.message);
  const { data: { publicUrl } } = supabase.storage.from("course-media").getPublicUrl(data.path);
  return publicUrl;
}

function lbl(text: string, optional?: boolean) {
  return (
    <p className="mb-1.5 font-mono text-xs uppercase tracking-widest text-ink-2">
      {text}{optional && <span className="ml-1 normal-case">(optional)</span>}
    </p>
  );
}

const inputCls = "w-full rounded-md bg-paper px-4 py-3 font-manrope text-sm text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-yellow";
const selectCls = "w-full rounded-md bg-paper px-4 py-3 font-manrope text-sm text-ink outline-none focus:ring-2 focus:ring-yellow appearance-none";

function UploadButton({ label, accept, uploading, compressing, error, onFile }: {
  label: string; accept: string; uploading: boolean; compressing: boolean; error: string | null; onFile: (f: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      <button type="button" disabled={uploading || compressing} onClick={() => ref.current?.click()}
        className="rounded-md bg-paper-2 px-3 py-1.5 font-manrope text-xs font-[800] text-ink-2 shadow-hard-sm transition hover:text-ink active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50">
        {compressing ? "Processing…" : uploading ? "Uploading..." : label}
      </button>
      {compressing && <p className="mt-1 font-manrope text-xs text-ink-2">Image is large — compressing before upload, please wait…</p>}
      {error && <p className="mt-1 font-manrope text-xs text-orange">{error}</p>}
    </div>
  );
}

function AudioPreview({ url, onRemove }: { url: string; onRemove: () => void }) {
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <audio src={url} controls className="h-8 min-w-0 flex-1" />
      <button type="button" onClick={onRemove} className="shrink-0 font-manrope text-xs font-[800] text-ink-3 hover:text-orange">Remove</button>
    </div>
  );
}

function ImagePreview({ url, onRemove }: { url: string; onRemove: () => void }) {
  return (
    <div className="mt-1.5 flex items-start gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="h-20 w-20 rounded-md object-cover shadow-hard-sm" />
      <button type="button" onClick={onRemove} className="font-manrope text-xs font-[800] text-ink-3 hover:text-orange">Remove</button>
    </div>
  );
}

function ItemCard({ item, index, isOnly, onUpdate, onRemove, onUpload, onClearUrl }: {
  item: Item; index: number; isOnly: boolean;
  onUpdate: (field: "front" | "back", value: string) => void;
  onRemove: () => void;
  onUpload: (field: UploadField, file: File) => void;
  onClearUrl: (field: "imageUrl" | "frontAudioUrl" | "backAudioUrl") => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-ink/10 bg-paper-2">
      <div className="flex items-center justify-between border-b border-ink/10 px-4 py-2.5">
        <span className="font-mono text-xs font-[700] uppercase tracking-widest text-ink-2">Card {index + 1}</span>
        {!isOnly && (
          <button type="button" onClick={onRemove}
            className="font-manrope text-xs font-[800] text-ink-3 transition hover:text-orange">
            Remove
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-px bg-ink/10 sm:grid-cols-2">
        <div className="bg-paper p-4">
          {lbl("Question")}
          <textarea value={item.front} onChange={(e) => onUpdate("front", e.target.value)}
            placeholder="e.g. Hello" rows={2}
            className="w-full resize-none bg-transparent font-manrope text-sm text-ink outline-none placeholder:text-ink-3" />
          <div className="mt-3">
            {lbl("Front audio", true)}
            {item.frontAudioUrl
              ? <AudioPreview url={item.frontAudioUrl} onRemove={() => onClearUrl("frontAudioUrl")} />
              : <UploadButton label="+ Upload audio" accept="audio/mpeg,audio/wav,audio/ogg,audio/webm"
                  uploading={item.uploads.frontAudio.uploading} compressing={item.uploads.frontAudio.compressing} error={item.uploads.frontAudio.error}
                  onFile={(f) => onUpload("frontAudio", f)} />}
          </div>
        </div>
        <div className="bg-paper-2 p-4">
          {lbl("Answer")}
          <textarea value={item.back} onChange={(e) => onUpdate("back", e.target.value)}
            placeholder="e.g. Xin chào" rows={2}
            className="w-full resize-none bg-transparent font-manrope text-sm text-ink outline-none placeholder:text-ink-3" />
          <div className="mt-3">
            {lbl("Back audio", true)}
            {item.backAudioUrl
              ? <AudioPreview url={item.backAudioUrl} onRemove={() => onClearUrl("backAudioUrl")} />
              : <UploadButton label="+ Upload audio" accept="audio/mpeg,audio/wav,audio/ogg,audio/webm"
                  uploading={item.uploads.backAudio.uploading} compressing={item.uploads.backAudio.compressing} error={item.uploads.backAudio.error}
                  onFile={(f) => onUpload("backAudio", f)} />}
          </div>
        </div>
      </div>
      <div className="border-t border-ink/10 bg-paper px-4 py-3">
        {lbl("Image", true)}
        {item.imageUrl
          ? <ImagePreview url={item.imageUrl} onRemove={() => onClearUrl("imageUrl")} />
          : <UploadButton label="+ Upload image" accept="image/jpeg,image/png,image/webp"
              uploading={item.uploads.image.uploading} compressing={item.uploads.image.compressing} error={item.uploads.image.error}
              onFile={(f) => onUpload("image", f)} />}
      </div>
    </div>
  );
}

const COLLAPSE_THRESHOLD = 5;

export default function EditCourseForm({ course, sections: dbSections }: { course: Course; sections: DbSection[] }) {
  const [state, formAction, pending] = useActionState(updateCourse, null);
  const [sections, setSections] = useState<Section[]>(() =>
    dbSections.length > 0 ? fromDb(dbSections) : [makeSection()]
  );
  const [collapsed, setCollapsed] = useState<Set<number>>(() => {
    const initial = dbSections.length > 0 ? fromDb(dbSections) : [makeSection()];
    return new Set(initial.filter((s) => s.items.length > COLLAPSE_THRESHOLD).map((s) => s.id));
  });
  const initialCategory =
    (course.category && TOP_LEVEL_CATEGORIES.includes(course.category) ? course.category : null) ??
    (course.subcategory ? getCategoryForItem(course.subcategory) : null) ??
    TOP_LEVEL_CATEGORIES[0];
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  function toggleCollapse(id: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function updateSection(id: number, field: "title" | "description", value: string) {
    setSections((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s));
  }
  function removeSection(id: number) {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }
  function addSection() {
    setSections((prev) => [...prev, makeSection()]);
  }
  function addItem(sectionId: number) {
    setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, items: [...s.items, makeItem()] } : s));
  }
  function updateItem(sectionId: number, itemId: number, field: "front" | "back", value: string) {
    setSections((prev) => prev.map((s) =>
      s.id === sectionId ? { ...s, items: s.items.map((i) => i.id === itemId ? { ...i, [field]: value } : i) } : s
    ));
  }
  function removeItem(sectionId: number, itemId: number) {
    setSections((prev) => prev.map((s) =>
      s.id === sectionId ? { ...s, items: s.items.filter((i) => i.id !== itemId) } : s
    ));
  }
  function clearUrl(sectionId: number, itemId: number, field: "imageUrl" | "frontAudioUrl" | "backAudioUrl") {
    setSections((prev) => prev.map((s) =>
      s.id === sectionId ? { ...s, items: s.items.map((i) => i.id === itemId ? { ...i, [field]: "" } : i) } : s
    ));
  }
  async function handleUpload(sectionId: number, itemId: number, field: UploadField, file: File) {
    const urlField = field === "image" ? "imageUrl" : field === "frontAudio" ? "frontAudioUrl" : "backAudioUrl";
    const willCompress = field === "image" && IMAGE_TYPES.includes(file.type) && file.size > IMAGE_MAX;
    setSections((prev) => prev.map((s) =>
      s.id === sectionId ? { ...s, items: s.items.map((i) =>
        i.id === itemId ? { ...i, uploads: { ...i.uploads, [field]: { uploading: !willCompress, compressing: willCompress, error: null } } } : i
      )} : s
    ));
    try {
      const url = await uploadToStorage(file);
      setSections((prev) => prev.map((s) =>
        s.id === sectionId ? { ...s, items: s.items.map((i) =>
          i.id === itemId ? { ...i, [urlField]: url, uploads: { ...i.uploads, [field]: { uploading: false, compressing: false, error: null } } } : i
        )} : s
      ));
    } catch (err) {
      setSections((prev) => prev.map((s) =>
        s.id === sectionId ? { ...s, items: s.items.map((i) =>
          i.id === itemId ? { ...i, uploads: { ...i.uploads, [field]: { uploading: false, compressing: false, error: (err as Error).message } } } : i
        )} : s
      ));
    }
  }
  function handleCsvImport(sectionId: number, file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCsv(text);
      if (rows.length === 0) return;
      const newItems = rows.map(([front, back]) => ({ ...makeItem(), front, back }));
      setSections((prev) => prev.map((s) => {
        if (s.id !== sectionId) return s;
        const hasContent = s.items.some((i) => i.front.trim() || i.back.trim());
        return { ...s, items: hasContent ? [...s.items, ...newItems] : newItems };
      }));
      if (newItems.length > COLLAPSE_THRESHOLD) {
        setCollapsed((prev) => new Set([...prev, sectionId]));
      }
    };
    reader.readAsText(file);
  }

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
  const hasValidItem = sections.some((s) => s.items.some((i) => i.front.trim() && i.back.trim()));
  const isUploading = sections.some((s) => s.items.some((i) => Object.values(i.uploads).some((u) => u.uploading || u.compressing)));

  const sectionsPayload = JSON.stringify(
    sections.map((s) => ({
      dbId: s.dbId,
      title: s.title || "Untitled section",
      description: s.description,
      items: s.items.map((i) => ({
        dbId: i.dbId,
        front: i.front,
        back: i.back,
        imageUrl: i.imageUrl,
        frontAudioUrl: i.frontAudioUrl,
        backAudioUrl: i.backAudioUrl,
      })),
    }))
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="course_id" value={course.id} />
      <input type="hidden" name="course_slug" value={course.slug} />
      <input type="hidden" name="sections_data" value={sectionsPayload} />

      {/* Course info */}
      <section className="rounded-lg bg-paper-2 p-8 shadow-hard">
        <h2 className="font-fredoka text-2xl font-[700] tracking-tight">Course info</h2>
        <div className="mt-6 flex flex-col gap-5">
          <div>
            {lbl("Title")}
            <input name="title" type="text" defaultValue={course.title}
              placeholder="e.g. Vietnamese for Beginners" required className={inputCls} />
          </div>
          <div>
            {lbl("Description", true)}
            <textarea name="description" defaultValue={course.description ?? ""}
              placeholder="What will learners get from this course?"
              rows={3} className={`${inputCls} resize-none`} />
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              {lbl("Category")}
              <select
                name="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={selectCls}
              >
                {TOP_LEVEL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              {lbl("Subcategory")}
              <select name="subcategory" defaultValue={course.subcategory ?? ""} className={selectCls}>
                {getCategoryItems(selectedCategory).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              {lbl("Difficulty")}
              <select name="level" defaultValue={course.level ?? ""} className={selectCls}>
                <option value="">Any level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              {lbl("Question language")}
              <select name="source_language" defaultValue={course.source_language ?? "English"} className={selectCls}>
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              {lbl("Answer language")}
              <select name="target_language" defaultValue={course.target_language ?? "Vietnamese"} className={selectCls}>
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              {lbl("Visibility")}
              <select name="visibility" defaultValue={course.visibility} className={selectCls}>
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Sections */}
      {sections.map((section, sIdx) => (
        <section key={section.id} className="rounded-lg bg-paper-2 shadow-hard">
          <div className="flex items-start gap-4 p-6 pb-4">
            <div className="flex-1 flex flex-col gap-3">
              <div>
                {lbl("Section name")}
                <input type="text" value={section.title} placeholder={`Section ${sIdx + 1}`}
                  onChange={(e) => updateSection(section.id, "title", e.target.value)}
                  className={inputCls} />
              </div>
              <div>
                {lbl("Description", true)}
                <input type="text" value={section.description}
                  placeholder="What's covered in this section?"
                  onChange={(e) => updateSection(section.id, "description", e.target.value)}
                  className={inputCls} />
              </div>
            </div>
            {sections.length > 1 && (
              <button type="button" onClick={() => removeSection(section.id)}
                className="mt-5 shrink-0 rounded-md px-3 py-2 font-manrope text-xs font-[800] text-ink-3 transition hover:text-orange">
                Remove section
              </button>
            )}
          </div>

          <div className="border-t border-ink/10 px-6 pb-6 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => toggleCollapse(section.id)}
                className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-ink-2 transition hover:text-ink"
              >
                <span className="text-[10px]">{collapsed.has(section.id) ? "▶" : "▼"}</span>
                Cards — {section.items.length}
              </button>
              <label className="cursor-pointer rounded-md bg-paper px-3 py-1.5 font-manrope text-xs font-[800] text-ink-2 shadow-hard-sm transition hover:text-ink active:translate-y-[1px] active:shadow-none">
                Import CSV
                <input type="file" accept=".csv,text/csv" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvImport(section.id, f); e.target.value = ""; }} />
              </label>
            </div>

            {!collapsed.has(section.id) && (
              <>
                <div className="flex flex-col gap-3">
                  {section.items.map((item, iIdx) => (
                    <ItemCard key={item.id} item={item} index={iIdx} isOnly={section.items.length === 1}
                      onUpdate={(field, value) => updateItem(section.id, item.id, field, value)}
                      onRemove={() => removeItem(section.id, item.id)}
                      onUpload={(field, file) => handleUpload(section.id, item.id, field, file)}
                      onClearUrl={(field) => clearUrl(section.id, item.id, field)} />
                  ))}
                </div>
                <button type="button" onClick={() => addItem(section.id)}
                  className="mt-3 w-full rounded-md border-2 border-dashed border-ink/20 py-3 font-manrope text-sm font-[800] text-ink-2 transition hover:border-orange hover:text-orange">
                  + Add card
                </button>
              </>
            )}
          </div>
        </section>
      ))}

      <button type="button" onClick={addSection}
        className="rounded-lg border-2 border-dashed border-ink/20 py-4 font-manrope text-sm font-[800] text-ink-2 transition hover:border-orange hover:text-orange">
        + Add section
      </button>

      {state?.error && (
        <p className="rounded-md border border-red bg-red-soft px-4 py-3 font-manrope text-sm text-ink">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-between pb-8">
        <div className="flex items-center gap-4">
          <Link href={`/c/${course.slug}`}
            className="font-manrope text-sm font-[800] text-ink-2 hover:text-ink">
            Cancel
          </Link>
          <p className="font-manrope text-sm text-ink-2">
            {isUploading ? "Uploading files..."
              : `${sections.length} section${sections.length === 1 ? "" : "s"} · ${totalItems} card${totalItems === 1 ? "" : "s"}`}
          </p>
        </div>
        <button type="submit" disabled={!hasValidItem || pending || isUploading}
          className="rounded-full bg-orange px-8 py-4 font-manrope text-base font-[800] text-white shadow-hard-red transition active:translate-y-[2px] active:shadow-hard-sm disabled:cursor-not-allowed disabled:bg-ink-3 disabled:shadow-none">
          {pending ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}
