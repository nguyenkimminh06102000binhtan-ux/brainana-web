"use client";

import { useState, useRef } from "react";
import { generateCardsWithAI, type AiImportCard } from "@/app/actions/ai-import";
import { t } from "@/utils/t";

// ── File constraints ──────────────────────────────────────────────────────────
const IMAGE_MAX  = 5  * 1024 * 1024;
const DOC_MAX    = 20 * 1024 * 1024;
const TEXT_MAX   = 5  * 1024 * 1024;
const TOTAL_MAX  = 25 * 1024 * 1024;
const MAX_IMAGES = 3;

const IMAGE_EXTS   = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
const DOC_EXTS     = new Set(["pdf", "docx", "pptx", "epub"]);
const TEXT_EXTS    = new Set(["txt", "md", "csv", "json"]);
const SHEET_EXTS   = new Set(["xlsx"]);
const BLOCKED_EXTS = new Set([
  "exe", "dmg", "pkg", "zip", "rar", "tar",
  "mp3", "mp4", "mov", "psd", "ai", "fig",
  "db", "sql", "py", "js", "ts",
]);
const ACCEPTED_ATTR = [
  ".jpg,.jpeg,.png,.gif,.webp",
  ".pdf,.docx,.xlsx,.txt,.md,.csv,.json",
].join(",");

// ── Card styles ───────────────────────────────────────────────────────────────
const CARD_STYLES = [
  { value: "vocabulary",  labelKey: "aiImportVocabulary" },
  { value: "phrases",     labelKey: "aiImportPhrases" },
  { value: "definitions", labelKey: "aiImportDefinitions" },
  { value: "qa",          labelKey: "aiImportQA" },
  { value: "translation", labelKey: "aiImportTranslation" },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function estimateCredits(files: File[], hasText: boolean): number {
  let total = hasText ? 5 : 0;
  for (const f of files) {
    const ext = f.name.toLowerCase().split(".").pop() ?? "";
    if (IMAGE_EXTS.has(ext)) total += 5;
    else if (SHEET_EXTS.has(ext) || TEXT_EXTS.has(ext)) total += 5;
    else if (DOC_EXTS.has(ext)) total += 8 + Math.ceil(f.size / (50 * 1024) / 5);
  }
  return total || 5;
}

function lbl(text: string, optional = false) {
  return (
    <p className="mb-1.5 font-mono text-xs uppercase tracking-widest text-ink-2">
      {text}{optional && <span className="ml-1 normal-case text-ink-3">(optional)</span>}
    </p>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface AiImportModalProps {
  sectionTitle: string;
  sectionDescription: string;
  courseTitle: string;
  sourceLanguage: string;
  targetLanguage: string;
  category: string;
  level: string;
  labels: Record<string, string>;
  onImport: (cards: AiImportCard[]) => void;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AiImportModal({
  sectionTitle,
  sectionDescription,
  courseTitle,
  sourceLanguage,
  targetLanguage,
  category,
  level,
  labels,
  onImport,
  onClose,
}: AiImportModalProps) {
  const [cardStyle, setCardStyle]               = useState("vocabulary");
  const [count, setCount]                       = useState(10);
  const [focus, setFocus]                       = useState("");
  const [pastedText, setPastedText]             = useState("");
  const [files, setFiles]                       = useState<File[]>([]);
  const [fileError, setFileError]               = useState<string | null>(null);
  const [status, setStatus]                     = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg]                 = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasContent = files.length > 0 || pastedText.trim().length > 0;

  // ── File validation ─────────────────────────────────────────────────────────
  function addFiles(list: FileList | null) {
    if (!list) return;
    setFileError(null);

    for (const f of Array.from(list)) {
      const ext = f.name.toLowerCase().split(".").pop() ?? "";

      if (BLOCKED_EXTS.has(ext)) {
        setFileError(labels.aiImportErrorBlocked!);
        return;
      }

      const isImage = IMAGE_EXTS.has(ext);
      const isDoc   = DOC_EXTS.has(ext);
      const limit   = isImage ? IMAGE_MAX : isDoc ? DOC_MAX : TEXT_MAX;
      if (f.size > limit) {
        setFileError(t(labels.aiImportErrorTooBig!, { name: f.name }));
        return;
      }
    }

    const merged = [...files, ...Array.from(list)];

    const imageCount = merged.filter((f) => IMAGE_EXTS.has(f.name.toLowerCase().split(".").pop() ?? "")).length;
    if (imageCount > MAX_IMAGES) { setFileError(labels.aiImportErrorTooManyImages!); return; }

    const totalSize = merged.reduce((s, f) => s + f.size, 0);
    if (totalSize > TOTAL_MAX) { setFileError(labels.aiImportErrorTotalTooLarge!); return; }

    setFiles(merged);
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!hasContent) { setFileError(labels.aiImportErrorNoContent!); return; }

    setStatus("loading");
    setErrorMsg(null);

    const fd = new FormData();
    fd.set("courseTitle",        courseTitle);
    fd.set("sourceLanguage",     sourceLanguage);
    fd.set("targetLanguage",     targetLanguage);
    fd.set("category",           category);
    fd.set("level",              level);
    fd.set("sectionTitle",       sectionTitle);
    fd.set("sectionDescription", sectionDescription);
    fd.set("cardStyle",          cardStyle);
    fd.set("count",              String(count));
    fd.set("focusInstruction",   focus);
    fd.set("pastedText",         pastedText);
    for (const f of files) fd.append("files", f);

    const result = await generateCardsWithAI(fd);

    if ("error" in result) {
      setStatus("error");
      setErrorMsg(result.error);
      return;
    }

    onImport(result.cards);
    onClose();
  }

  const estimatedCredits = estimateCredits(files, pastedText.trim().length > 0);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-paper shadow-hard">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
          <h2 className="font-fredoka text-xl font-[700] tracking-tight">{labels.aiImportTitle}</h2>
          <button type="button" onClick={onClose} className="font-manrope text-sm text-ink-3 hover:text-ink">✕</button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-5">

            {/* Card style */}
            <div>
              {lbl(labels.aiImportCardStyle!)}
              <select
                value={cardStyle}
                onChange={(e) => setCardStyle(e.target.value)}
                className="w-full rounded-md bg-paper-2 px-4 py-3 font-manrope text-sm text-ink outline-none focus:ring-2 focus:ring-yellow appearance-none"
              >
                {CARD_STYLES.map((s) => (
                  <option key={s.value} value={s.value}>{labels[s.labelKey]}</option>
                ))}
              </select>
            </div>

            {/* Number of cards */}
            <div>
              {lbl(labels.aiImportCount!)}
              <input
                type="number"
                min={1}
                max={50}
                value={count}
                onChange={(e) => setCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full rounded-md bg-paper-2 px-4 py-3 font-manrope text-sm text-ink outline-none focus:ring-2 focus:ring-yellow"
              />
            </div>

            {/* Focus instruction */}
            <div>
              {lbl(labels.aiImportFocus!, true)}
              <input
                type="text"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder={labels.aiImportFocusPlaceholder}
                className="w-full rounded-md bg-paper-2 px-4 py-3 font-manrope text-sm text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-yellow"
              />
            </div>

            {/* Source content */}
            <div>
              {lbl(labels.aiImportSourceContent!)}

              {/* File upload */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_ATTR}
                className="hidden"
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mb-3 w-full rounded-md border-2 border-dashed border-ink/20 py-3 font-manrope text-sm font-[700] text-ink-2 transition hover:border-orange hover:text-orange-text"
              >
                {labels.aiImportUploadFile}
              </button>

              {/* File list */}
              {files.length > 0 && (
                <div className="mb-3 flex flex-col gap-1.5">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md bg-paper-2 px-3 py-2">
                      <span className="truncate font-mono text-xs text-ink-2">{f.name} · {fmt(f.size)}</span>
                      <button
                        type="button"
                        onClick={() => { setFiles(files.filter((_, j) => j !== i)); setFileError(null); }}
                        className="ml-2 shrink-0 font-manrope text-xs text-ink-3 hover:text-orange-text"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {fileError && (
                <p className="mb-2 font-manrope text-xs text-orange-text">{fileError}</p>
              )}

              {/* Paste text */}
              <p className="mb-1.5 font-mono text-xs text-ink-3">{labels.aiImportPasteText}</p>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={labels.aiImportPastePlaceholder}
                rows={4}
                className="w-full resize-none rounded-md bg-paper-2 px-4 py-3 font-manrope text-sm text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-yellow"
              />
            </div>

            {/* Estimated cost (placeholder) */}
            {hasContent && (
              <div className="rounded-md border border-ink/10 bg-paper-2 px-4 py-3">
                <p className="font-mono text-xs uppercase tracking-widest text-ink-3">{labels.aiImportEstimatedCost}</p>
                <p className="mt-0.5 font-manrope text-sm font-[700] text-ink">
                  ~{estimatedCredits} {labels.aiImportCredits}
                  <span className="ml-2 font-normal text-ink-3 text-xs">{labels.aiImportCreditNote}</span>
                </p>
              </div>
            )}

            {/* Error */}
            {status === "error" && errorMsg && (
              <p className="rounded-md bg-red-soft px-4 py-3 font-manrope text-sm text-ink">{errorMsg}</p>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-ink/10 px-6 py-4">
          <button type="button" onClick={onClose} className="font-manrope text-sm font-[800] text-ink-2 hover:text-ink">
            {labels.aiImportCancel}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={status === "loading" || !hasContent}
            className="rounded-full bg-orange px-5 py-2.5 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "loading" ? labels.aiImportGenerating : labels.aiImportGenerate}
          </button>
        </div>

      </div>
    </div>
  );
}
