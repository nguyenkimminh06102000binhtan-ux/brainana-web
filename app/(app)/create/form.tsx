"use client";

import { useActionState, useRef, useState } from "react";
import { createCourse } from "./actions";
import MathToolbar from "@/app/(app)/_components/math-toolbar";
import { createClient } from "@/utils/supabase/client";
import { compressImage } from "@/utils/compress-image";
import { SUPPORTED_COURSE_LANGUAGES, TOP_LEVEL_CATEGORIES, getCategoryItems } from "@/app/constants/categories";
import { t } from "@/utils/t";
import { bucketForVisibility, buildStoragePath, PUBLIC_BUCKET } from "@/utils/storage";
import { getRomanizationSystem } from "@/utils/romanization";
import { suggestRomanization } from "@/app/actions/romanization";
import AiImportModal from "./ai-import-modal";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm"];
const IMAGE_MAX = 5 * 1024 * 1024;
const AUDIO_MAX = 10 * 1024 * 1024;

type UploadState = { uploading: boolean; compressing: boolean; error: string | null };
type UploadField = "image" | "frontAudio" | "backAudio";

type Item = {
  id: number;
  front: string;
  back: string;
  romanization: string;
  imagePath: string;
  imageDisplayUrl: string;
  frontAudioPath: string;
  frontAudioDisplayUrl: string;
  backAudioPath: string;
  backAudioDisplayUrl: string;
  distractors: string[];
  uploads: Record<UploadField, UploadState>;
};

type Section = {
  id: number;
  title: string;
  description: string;
  items: Item[];
};

let uid = 1;
const freshUpload = (): Record<UploadField, UploadState> => ({
  image: { uploading: false, compressing: false, error: null },
  frontAudio: { uploading: false, compressing: false, error: null },
  backAudio: { uploading: false, compressing: false, error: null },
});
const makeItem = (): Item => ({
  id: uid++,
  front: "",
  back: "",
  romanization: "",
  imagePath: "",
  imageDisplayUrl: "",
  frontAudioPath: "",
  frontAudioDisplayUrl: "",
  backAudioPath: "",
  backAudioDisplayUrl: "",
  distractors: [],
  uploads: freshUpload(),
});
const makeSection = (): Section => ({ id: uid++, title: "", description: "", items: [makeItem()] });

type CreateEditLabels = Record<string, string>;
type LevelLabels = { beginner: string; intermediate: string; advanced: string };

function label(text: string, optional?: boolean, optionalLabel = "optional") {
  return (
    <p className="mb-1.5 font-mono text-xs uppercase tracking-widest text-ink-2">
      {text}{optional && <span className="ml-1 normal-case">({optionalLabel})</span>}
    </p>
  );
}

const inputCls = "w-full rounded-md bg-paper px-4 py-3 font-manrope text-sm text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-ink";
const selectCls = "w-full rounded-md bg-paper px-4 py-3 font-manrope text-sm text-ink outline-none focus:ring-2 focus:ring-ink appearance-none";

function parseCsv(text: string): Array<[string, string, string]> {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const results: Array<[string, string, string]> = [];

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
    const romanization = cols[2]?.trim() ?? "";
    if (front && back) results.push([front, back, romanization]);
  }
  return results;
}

async function uploadToStorage(
  file: File,
  labels: CreateEditLabels,
  courseId: string,
  visibility: string,
): Promise<{ storagePath: string; displayUrl: string }> {
  const isImage = IMAGE_TYPES.includes(file.type);
  const isAudio = AUDIO_TYPES.includes(file.type);
  if (!isImage && !isAudio) throw new Error(labels.unsupportedFileType);
  if (isAudio && file.size > AUDIO_MAX) throw new Error(labels.audioTooLarge);

  const fileToUpload = isImage ? await compressImage(file, IMAGE_MAX) : file;
  const supabase = createClient();
  const ext = fileToUpload.name.split(".").pop();
  const objectPath = `courses/${courseId}/items/${crypto.randomUUID()}.${ext}`;
  const bucket = bucketForVisibility(visibility);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(objectPath, fileToUpload, { contentType: fileToUpload.type });
  if (error) throw new Error(error.message);

  let displayUrl: string;
  if (bucket === PUBLIC_BUCKET) {
    displayUrl = supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl;
  } else {
    const { data: signData, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(data.path, 3600);
    if (signError || !signData?.signedUrl) throw new Error("Failed to get preview URL");
    displayUrl = signData.signedUrl;
  }

  return { storagePath: buildStoragePath(bucket, data.path), displayUrl };
}

function UploadButton({ label: lbl, labels, accept, uploading, compressing, error, onFile }: {
  label: string; labels: CreateEditLabels; accept: string; uploading: boolean; compressing: boolean; error: string | null; onFile: (f: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      <button type="button" disabled={uploading || compressing} onClick={() => ref.current?.click()}
        className="rounded-md bg-paper-2 px-3 py-1.5 font-manrope text-xs font-[800] text-ink-2 shadow-hard-sm transition hover:text-ink active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50">
        {compressing ? labels.processing : uploading ? labels.uploading : lbl}
      </button>
      {compressing && <p className="mt-1 font-manrope text-xs text-ink-2">{labels.compressingImage}</p>}
      {error && <p className="mt-1 font-manrope text-xs text-orange-text">{error}</p>}
    </div>
  );
}

function AudioPreview({ url, onRemove, removeLabel }: { url: string; onRemove: () => void; removeLabel: string }) {
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <audio src={url} controls className="h-8 min-w-0 flex-1" />
      <button type="button" onClick={onRemove} className="shrink-0 font-manrope text-xs font-[800] text-ink-3 hover:text-orange-text">{removeLabel}</button>
    </div>
  );
}

function ImagePreview({ url, onRemove, removeLabel }: { url: string; onRemove: () => void; removeLabel: string }) {
  return (
    <div className="mt-1.5 flex items-start gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="h-20 w-20 rounded-md object-cover shadow-hard-sm" />
      <button type="button" onClick={onRemove} className="font-manrope text-xs font-[800] text-ink-3 hover:text-orange-text">{removeLabel}</button>
    </div>
  );
}

function ItemCard({ item, index, isOnly, targetLanguage, labels, onUpdate, onRemove, onUpload, onClearUrl, onFocusInput }: {
  item: Item;
  index: number;
  isOnly: boolean;
  targetLanguage: string;
  labels: CreateEditLabels;
  onUpdate: (field: "front" | "back" | "romanization", value: string) => void;
  onRemove: () => void;
  onUpload: (field: UploadField, file: File) => void;
  onClearUrl: (field: "imagePath" | "frontAudioPath" | "backAudioPath") => void;
  onFocusInput: (el: HTMLTextAreaElement, setter: (v: string) => void) => void;
}) {
  const [suggesting, setSuggesting] = useState(false);
  const roSystem = getRomanizationSystem(targetLanguage);

  async function handleAutoRomanization() {
    if (!item.back.trim() || !roSystem) return;
    setSuggesting(true);
    try {
      const { romanization } = await suggestRomanization(item.back, targetLanguage);
      if (romanization) onUpdate("romanization", romanization);
    } finally {
      setSuggesting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-md border border-ink/10 bg-paper-2">
      <div className="flex items-center justify-between border-b border-ink/10 px-4 py-2.5">
        <span className="font-mono text-xs font-[700] uppercase tracking-widest text-ink-2">{t(labels.cardLabel, { number: index + 1 })}</span>
        {!isOnly && (
          <button type="button" onClick={onRemove}
            className="font-manrope text-xs font-[800] text-ink-3 transition hover:text-orange-text">
            {labels.remove}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-px bg-ink/10 sm:grid-cols-2">
        <div className="bg-paper p-4">
          {label(labels.question)}
          <textarea name="_front" value={item.front} onChange={(e) => onUpdate("front", e.target.value)} aria-label={labels.question}
            onFocus={(e) => onFocusInput(e.currentTarget, (v) => onUpdate("front", v))}
            placeholder={labels.questionPlaceholder} rows={2}
            className="w-full resize-none bg-transparent font-manrope text-sm text-ink outline-none placeholder:text-ink-3" />
          <div className="mt-3">
            {label(labels.frontAudio, true, labels.optional)}
            {item.frontAudioDisplayUrl
              ? <AudioPreview url={item.frontAudioDisplayUrl} removeLabel={labels.remove} onRemove={() => onClearUrl("frontAudioPath")} />
              : <UploadButton label={labels.uploadAudio} labels={labels} accept="audio/mpeg,audio/wav,audio/ogg,audio/webm"
                  uploading={item.uploads.frontAudio.uploading} compressing={item.uploads.frontAudio.compressing} error={item.uploads.frontAudio.error}
                  onFile={(f) => onUpload("frontAudio", f)} />}
          </div>
        </div>

        <div className="bg-paper-2 p-4">
          {label(labels.answer)}
          <textarea name="_back" value={item.back} onChange={(e) => onUpdate("back", e.target.value)} aria-label={labels.answer}
            onFocus={(e) => onFocusInput(e.currentTarget, (v) => onUpdate("back", v))}
            placeholder={labels.answerPlaceholder} rows={2}
            className="w-full resize-none bg-transparent font-manrope text-sm text-ink outline-none placeholder:text-ink-3" />
          <div className="mt-3">
            {label(labels.backAudio, true, labels.optional)}
            {item.backAudioDisplayUrl
              ? <AudioPreview url={item.backAudioDisplayUrl} removeLabel={labels.remove} onRemove={() => onClearUrl("backAudioPath")} />
              : <UploadButton label={labels.uploadAudio} labels={labels} accept="audio/mpeg,audio/wav,audio/ogg,audio/webm"
                  uploading={item.uploads.backAudio.uploading} compressing={item.uploads.backAudio.compressing} error={item.uploads.backAudio.error}
                  onFile={(f) => onUpload("backAudio", f)} />}
          </div>
        </div>
      </div>
      {roSystem && (
        <div className="border-t border-ink/10 bg-paper px-4 py-3">
          {label(t(labels.romanization, { system: roSystem.system }), true, labels.optional)}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={item.romanization}
              onChange={(e) => onUpdate("romanization", e.target.value)}
              placeholder={roSystem.placeholder}
              className="min-w-0 flex-1 bg-transparent font-manrope text-sm text-ink outline-none placeholder:text-ink-3"
            />
            <button
              type="button"
              onClick={handleAutoRomanization}
              disabled={suggesting || !item.back.trim()}
              className="shrink-0 rounded-md bg-paper-2 px-3 py-1.5 font-manrope text-xs font-[800] text-ink-2 shadow-hard-sm transition hover:text-ink active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {suggesting ? labels.generating : labels.autoGenerate}
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-ink/10 bg-paper px-4 py-3">
        {label(labels.image, true, labels.optional)}
        {item.imageDisplayUrl
          ? <ImagePreview url={item.imageDisplayUrl} removeLabel={labels.remove} onRemove={() => onClearUrl("imagePath")} />
          : <UploadButton label={labels.uploadImage} labels={labels} accept="image/jpeg,image/png,image/webp"
              uploading={item.uploads.image.uploading} compressing={item.uploads.image.compressing} error={item.uploads.image.error}
              onFile={(f) => onUpload("image", f)} />}
      </div>
    </div>
  );
}

const COLLAPSE_THRESHOLD = 5;

export default function CreateCourseForm({
  labels,
  categories,
  levels,
}: {
  labels: CreateEditLabels;
  categories: Record<string, string>;
  levels: LevelLabels;
}) {
  const [state, formAction, pending] = useActionState(createCourse, null);
  const [sections, setSections] = useState<Section[]>([makeSection()]);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState(TOP_LEVEL_CATEGORIES[0]);
  const [selectedVisibility, setSelectedVisibility] = useState("public");
  const [selectedTargetLanguage, setSelectedTargetLanguage] = useState("Vietnamese");
  const [selectedSourceLanguage, setSelectedSourceLanguage] = useState("English (US)");
  const [formTitle, setFormTitle] = useState("");
  const [bulkStatuses, setBulkStatuses] = useState<Map<number, string>>(new Map());
  const [aiImportSectionId, setAiImportSectionId] = useState<number | null>(null);
  const [aiImportValidationError, setAiImportValidationError] = useState<string | null>(null);
  const prospectiveCourseId = useRef(crypto.randomUUID());
  const lastFocusedEl = useRef<HTMLTextAreaElement | null>(null);
  const lastFocusedSetter = useRef<((v: string) => void) | null>(null);

  function insertSymbol(sym: string) {
    const el = lastFocusedEl.current;
    const setter = lastFocusedSetter.current;
    if (!el || !setter) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    setter(el.value.slice(0, start) + sym + el.value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + sym.length, start + sym.length);
    });
  }

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

  function updateItem(sectionId: number, itemId: number, field: "front" | "back" | "romanization", value: string) {
    setSections((prev) => prev.map((s) =>
      s.id === sectionId
        ? { ...s, items: s.items.map((item) => item.id === itemId ? { ...item, [field]: value } : item) }
        : s
    ));
  }

  function removeItem(sectionId: number, itemId: number) {
    setSections((prev) => prev.map((s) =>
      s.id === sectionId ? { ...s, items: s.items.filter((item) => item.id !== itemId) } : s
    ));
  }

  function clearUrl(sectionId: number, itemId: number, field: "imagePath" | "frontAudioPath" | "backAudioPath") {
    const displayField = field === "imagePath"
      ? "imageDisplayUrl"
      : field === "frontAudioPath"
        ? "frontAudioDisplayUrl"
        : "backAudioDisplayUrl";
    setSections((prev) => prev.map((s) =>
      s.id === sectionId
        ? { ...s, items: s.items.map((item) => item.id === itemId ? { ...item, [field]: "", [displayField]: "" } : item) }
        : s
    ));
  }

  async function handleSectionBulkGenerate(sectionId: number) {
    const roSystem = getRomanizationSystem(selectedTargetLanguage);
    if (!roSystem) return;
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    const missing = section.items
      .filter((i) => i.back.trim() && !i.romanization.trim())
      .map((i) => ({ itemId: i.id, back: i.back }));
    if (missing.length === 0) return;
    const BATCH = 10;
    let done = 0;
    setBulkStatuses((prev) => new Map(prev).set(sectionId, t(labels.bulkGeneratingRomanization, { done: 0, total: missing.length })));
    for (let i = 0; i < missing.length; i += BATCH) {
      const batch = missing.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async ({ itemId, back }) => {
          const { romanization } = await suggestRomanization(back, selectedTargetLanguage);
          if (romanization) updateItem(sectionId, itemId, "romanization", romanization);
        })
      );
      done += batch.length;
      setBulkStatuses((prev) => new Map(prev).set(sectionId, t(labels.bulkGeneratingRomanization, { done, total: missing.length })));
    }
    setBulkStatuses((prev) => new Map(prev).set(sectionId, t(labels.bulkGenerateDoneRomanization, { count: missing.length })));
    setTimeout(() => setBulkStatuses((prev) => { const next = new Map(prev); next.delete(sectionId); return next; }), 3000);
  }

  async function handleUpload(sectionId: number, itemId: number, field: UploadField, file: File) {
    const pathField = field === "image" ? "imagePath" : field === "frontAudio" ? "frontAudioPath" : "backAudioPath";
    const displayField = field === "image" ? "imageDisplayUrl" : field === "frontAudio" ? "frontAudioDisplayUrl" : "backAudioDisplayUrl";
    const willCompress = field === "image" && IMAGE_TYPES.includes(file.type) && file.size > IMAGE_MAX;
    setSections((prev) => prev.map((s) =>
      s.id === sectionId
        ? { ...s, items: s.items.map((item) =>
            item.id === itemId ? { ...item, uploads: { ...item.uploads, [field]: { uploading: !willCompress, compressing: willCompress, error: null } } } : item
          )}
        : s
    ));
    try {
      const { storagePath, displayUrl } = await uploadToStorage(
        file,
        labels,
        prospectiveCourseId.current,
        selectedVisibility,
      );
      setSections((prev) => prev.map((s) =>
        s.id === sectionId
          ? { ...s, items: s.items.map((item) =>
              item.id === itemId
                ? { ...item, [pathField]: storagePath, [displayField]: displayUrl, uploads: { ...item.uploads, [field]: { uploading: false, compressing: false, error: null } } }
                : item
            )}
          : s
      ));
    } catch (err) {
      setSections((prev) => prev.map((s) =>
        s.id === sectionId
          ? { ...s, items: s.items.map((item) =>
              item.id === itemId ? { ...item, uploads: { ...item.uploads, [field]: { uploading: false, compressing: false, error: (err as Error).message } } } : item
            )}
          : s
      ));
    }
  }

  function handleCsvImport(sectionId: number, file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCsv(text);
      if (rows.length === 0) return;
      const newItems = rows.map(([front, back, romanization]) => ({ ...makeItem(), front, back, romanization }));
      setSections((prev) => prev.map((s) => {
        if (s.id !== sectionId) return s;
        const hasContent = s.items.some((i) => i.front.trim() || i.back.trim());
        return {
          ...s,
          items: hasContent ? [...s.items, ...newItems] : newItems,
        };
      }));
      if (newItems.length > COLLAPSE_THRESHOLD) {
        setCollapsed((prev) => new Set([...prev, sectionId]));
      }
    };
    reader.readAsText(file);
  }

  function handleAiImport(sectionId: number, cards: Array<{ front: string; back: string; distractors?: string[]; accepted_answers?: string[] }>) {
    const newItems = cards.map((c) => ({ ...makeItem(), front: c.front, back: c.back, distractors: c.distractors ?? [] }));
    setSections((prev) => prev.map((s) => {
      if (s.id !== sectionId) return s;
      const hasContent = s.items.some((i) => i.front.trim() || i.back.trim());
      return { ...s, items: hasContent ? [...s.items, ...newItems] : newItems };
    }));
    if (newItems.length > COLLAPSE_THRESHOLD) {
      setCollapsed((prev) => new Set([...prev, sectionId]));
    }
  }

  function openAiImport(sectionId: number) {
    if (!formTitle.trim()) {
      setAiImportValidationError(labels.aiImportErrorNoTitle!);
      return;
    }
    setAiImportValidationError(null);
    setAiImportSectionId(sectionId);
  }

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
  const hasValidItem = sections.some((s) => s.items.some((i) => i.front.trim() && i.back.trim()));
  const isUploading = sections.some((s) => s.items.some((i) => Object.values(i.uploads).some((u) => u.uploading || u.compressing)));

  const sectionsPayload = JSON.stringify(
    sections.map((s) => ({
      title: s.title || labels.untitledSection,
      description: s.description,
      items: s.items.map((i) => ({
        front: i.front,
        back: i.back,
        romanization: i.romanization,
        imagePath: i.imagePath,
        frontAudioPath: i.frontAudioPath,
        backAudioPath: i.backAudioPath,
        distractors: i.distractors,
      })),
    }))
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="sections_data" value={sectionsPayload} />
      <input type="hidden" name="prospective_course_id" value={prospectiveCourseId.current} />

      {/* Course info */}
      <section className="rounded-lg bg-paper-2 p-8 shadow-hard">
        <h2 className="font-fredoka text-2xl font-[700] tracking-tight">{labels.courseInfo}</h2>

        <div className="mt-6 flex flex-col gap-5">
          <div>
            {label(labels.title)}
            <input id="title" name="title" type="text" value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder={labels.titlePlaceholder} required className={inputCls} />
            {aiImportValidationError && (
              <p className="mt-1.5 font-manrope text-xs text-orange-text">{aiImportValidationError}</p>
            )}
          </div>

          <div>
            {label(labels.description, true, labels.optional)}
            <textarea id="description" name="description"
              defaultValue={labels.descriptionDefault}
              placeholder={labels.descriptionPlaceholder}
              rows={3} className={`${inputCls} resize-none`} />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              {label(labels.category)}
              <select
                id="category"
                name="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={selectCls}
              >
                {TOP_LEVEL_CATEGORIES.map((c) => <option key={c} value={c}>{categories[c] ?? c}</option>)}
              </select>
            </div>
            <div>
              {label(labels.subcategory)}
              <select id="subcategory" name="subcategory" className={selectCls}>
                {getCategoryItems(selectedCategory).map((s) => <option key={s} value={s}>{categories[s] ?? s}</option>)}
              </select>
            </div>
            <div>
              {label(labels.difficulty)}
              <select id="level" name="level" defaultValue="beginner" className={selectCls}>
                <option value="">{labels.anyLevel}</option>
                <option value="beginner">{levels.beginner}</option>
                <option value="intermediate">{levels.intermediate}</option>
                <option value="advanced">{levels.advanced}</option>
              </select>
            </div>
            <div>
              {label(labels.visibility)}
              <select
                id="visibility"
                name="visibility"
                value={selectedVisibility}
                onChange={(e) => setSelectedVisibility(e.target.value)}
                className={selectCls}
              >
                <option value="public">{labels.public}</option>
                <option value="unlisted">{labels.unlisted}</option>
                <option value="private">{labels.private}</option>
              </select>
            </div>
            <div>
              {label(labels.questionLanguage)}
              <select id="source_language" name="source_language" value={selectedSourceLanguage} onChange={(e) => setSelectedSourceLanguage(e.target.value)} className={selectCls}>
                {SUPPORTED_COURSE_LANGUAGES.map((l) => <option key={l} value={l}>{categories[l] ?? l}</option>)}
              </select>
            </div>
            <div>
              {label(labels.answerLanguage)}
              <select
                id="target_language"
                name="target_language"
                value={selectedTargetLanguage}
                onChange={(e) => setSelectedTargetLanguage(e.target.value)}
                className={selectCls}
              >
                {SUPPORTED_COURSE_LANGUAGES.map((l) => <option key={l} value={l}>{categories[l] ?? l}</option>)}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Sections */}
      {sections.map((section, sIdx) => (
        <section key={section.id} className="rounded-lg bg-paper-2 shadow-hard">
          {/* Section header */}
          <div className="flex items-start gap-4 p-6 pb-4">
            <div className="flex-1 flex flex-col gap-3">
              <div>
                {label(labels.sectionName)}
                <input type="text" value={section.title} placeholder={t(labels.sectionPlaceholder, { number: sIdx + 1 })}
                  onChange={(e) => updateSection(section.id, "title", e.target.value)}
                  className={inputCls} />
              </div>
              <div>
                {label(labels.description, true, labels.optional)}
                <input type="text" value={section.description}
                  placeholder={labels.sectionDescriptionPlaceholder}
                  onChange={(e) => updateSection(section.id, "description", e.target.value)}
                  className={inputCls} />
              </div>
            </div>
            {sections.length > 1 && (
              <button type="button" onClick={() => removeSection(section.id)}
                className="mt-5 shrink-0 rounded-md px-3 py-2 font-manrope text-xs font-[800] text-ink-3 transition hover:text-orange-text">
                {labels.removeSection}
              </button>
            )}
          </div>

          {/* Items nested inside section */}
          <div className="border-t border-ink/10 px-6 pb-6 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => toggleCollapse(section.id)}
                className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-ink-2 transition hover:text-ink"
              >
                <span className="text-xs">{collapsed.has(section.id) ? "▶" : "▼"}</span>
                {t(labels.cardsSummary, { count: section.items.length })}
              </button>
              <div className="flex items-center gap-2">
                {getRomanizationSystem(selectedTargetLanguage) && (
                  <div className="flex items-center gap-1.5">
                    {bulkStatuses.get(section.id) && (
                      <span className="font-manrope text-xs text-ink-2">{bulkStatuses.get(section.id)}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSectionBulkGenerate(section.id)}
                      disabled={!!bulkStatuses.get(section.id)}
                      className="rounded-md bg-paper px-3 py-1.5 font-manrope text-xs font-[800] text-ink-2 shadow-hard-sm transition hover:text-ink active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {labels.bulkGenerateRomanization}
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => openAiImport(section.id)}
                  className="rounded-md bg-paper px-3 py-1.5 font-manrope text-xs font-[800] text-ink-2 shadow-hard-sm transition hover:text-orange-text active:translate-y-[1px] active:shadow-none"
                >
                  {labels.aiImportButton}
                </button>
                <label className="cursor-pointer rounded-md bg-paper px-3 py-1.5 font-manrope text-xs font-[800] text-ink-2 shadow-hard-sm transition hover:text-ink active:translate-y-[1px] active:shadow-none">
                  {labels.importCsv}
                  <input type="file" accept=".csv,text/csv" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvImport(section.id, f); e.target.value = ""; }} />
                </label>
              </div>
            </div>

            {!collapsed.has(section.id) && (
              <>
                <div className="flex flex-col gap-3">
                  {section.items.map((item, iIdx) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      index={iIdx}
                      isOnly={section.items.length === 1}
                      targetLanguage={selectedTargetLanguage}
                      labels={labels}
                      onUpdate={(field, value) => updateItem(section.id, item.id, field, value)}
                      onRemove={() => removeItem(section.id, item.id)}
                      onUpload={(field, file) => handleUpload(section.id, item.id, field, file)}
                      onClearUrl={(field) => clearUrl(section.id, item.id, field)}
                      onFocusInput={(el, setter) => { lastFocusedEl.current = el; lastFocusedSetter.current = setter; }}
                    />
                  ))}
                </div>
                <button type="button" onClick={() => addItem(section.id)}
                  className="mt-3 w-full rounded-md border-2 border-dashed border-ink/20 py-3 font-manrope text-sm font-[800] text-ink-2 transition hover:border-orange hover:text-orange-text">
                  {labels.addCard}
                </button>
              </>
            )}
          </div>
        </section>
      ))}

      <button type="button" onClick={addSection}
        className="rounded-lg border-2 border-dashed border-ink/20 py-4 font-manrope text-sm font-[800] text-ink-2 transition hover:border-orange hover:text-orange-text">
        {labels.addSection}
      </button>

      {state?.error && (
        <p className="rounded-md border border-red bg-red-soft px-4 py-3 font-manrope text-sm text-ink">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-between pb-8">
        <p className="font-manrope text-sm text-ink-2">
          {isUploading
            ? labels.uploadingFiles
            : hasValidItem
            ? t(labels.summary, {
                sections: sections.length,
                sectionUnit: sections.length === 1 ? labels.sectionUnit : labels.sectionUnits,
                cards: totalItems,
                cardUnit: totalItems === 1 ? labels.cardUnit : labels.cardUnits,
              })
            : labels.addAtLeastOneCard}
        </p>
        <button type="submit" disabled={!hasValidItem || pending || isUploading}
          className="rounded-full bg-orange px-8 py-4 font-manrope text-base font-[800] text-on-bright shadow-hard-red transition active:translate-y-[2px] active:shadow-hard-sm disabled:cursor-not-allowed disabled:bg-ink-3 disabled:text-on-ink disabled:shadow-none">
          {pending ? labels.creating : labels.createCourse}
        </button>
      </div>

      {aiImportSectionId !== null && (
        <AiImportModal
          courseTitle={formTitle}
          sourceLanguage={selectedSourceLanguage}
          targetLanguage={selectedTargetLanguage}
          category={selectedCategory}
          level=""
          sectionTitle={sections.find((s) => s.id === aiImportSectionId)?.title ?? ""}
          sectionDescription={sections.find((s) => s.id === aiImportSectionId)?.description ?? ""}
          labels={labels}
          onImport={(cards) => handleAiImport(aiImportSectionId, cards)}
          onClose={() => setAiImportSectionId(null)}
        />
      )}
      <div className="fixed bottom-6 right-6 z-50">
        <MathToolbar onInsert={insertSymbol} direction="up" />
      </div>
    </form>
  );
}
