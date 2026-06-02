"use client";

import { useState, useRef, useEffect } from "react";
import { generateCardsWithAI, type AiImportCard } from "@/app/actions/ai-import";
import { compressImage } from "@/utils/compress-image";
import { createClient } from "@/utils/supabase/client";
import { t } from "@/utils/t";
import { showQuotaToast } from "@/components/quota-toast";

const TEMP_BUCKET = "temp-uploads";

// ── Types ─────────────────────────────────────────────────────────────────────
type ProcessedFile = {
  file: File;
  status: "pending" | "processing" | "done" | "error" | "scanned_pdf";
  charCount?: number;
  extractedText?: string;
};

// ── File constraints ──────────────────────────────────────────────────────────
const IMAGE_MAX  = 20 * 1024 * 1024;
const DOC_MAX    = 50 * 1024 * 1024;
const TEXT_MAX   = 20 * 1024 * 1024;
const TOTAL_MAX  = 100 * 1024 * 1024;

const IMAGE_EXTS   = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
const DOC_EXTS     = new Set(["pdf", "docx", "pptx", "epub"]);
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

function fmtChars(n: number): string {
  if (n < 1_000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(2)}M`;
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
  const [count, setCount]                       = useState("10");
  const [countError, setCountError]             = useState<string | null>(null);
  const [focus, setFocus]                       = useState("");
  const [pastedText, setPastedText]             = useState("");
  const [files, setFiles]                       = useState<ProcessedFile[]>([]);
  const [fileError, setFileError]               = useState<string | null>(null);
  const [status, setStatus]                     = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg]                 = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds]     = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef    = useRef<HTMLDivElement>(null);

  // Derived early so the useEffect below can reference it without a stale closure.
  // isBusyRef is updated every render so the keydown handler always sees current value.
  const isBusy = status === "loading" || files.some((pf) => pf.status === "processing" || pf.status === "pending");
  const isBusyRef = useRef(isBusy);
  isBusyRef.current = isBusy;

  // Estimate generation time based on card count and style
  const tokensPerCard: Record<string, number> = {
    vocabulary: 80, phrases: 130, translation: 130,
    definitions: 210, qa: 210,
  };
  const estimatedSeconds = Math.ceil(
    (parseInt(count) || 10) * (tokensPerCard[cardStyle] ?? 130) / 150
  );

  // Focus first focusable element and trap Tab inside the modal
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const els = Array.from(dialog.querySelectorAll<HTMLElement>(focusable));
    els[0]?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { if (!isBusyRef.current) onClose(); return; }
      if (e.key !== "Tab" || els.length === 0) return;
      const first = els[0]!;
      const last  = els[els.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hasContent = files.length > 0 || pastedText.trim().length > 0;

  // ── File analysis ───────────────────────────────────────────────────────────
  async function analyzeFile(pf: ProcessedFile): Promise<ProcessedFile> {
    setFiles((prev) => prev.map((f) => f.file === pf.file ? { ...f, status: "processing" } : f));
    try {
      const ext = pf.file.name.toLowerCase().split(".").pop() ?? "";
      const isImage = IMAGE_EXTS.has(ext);

      let res: Response;

      if (isImage) {
        // Images: compress client-side then upload directly
        const compressed = await compressImage(pf.file, 4 * 1024 * 1024, 2000);
        const fd = new FormData();
        fd.set("file", compressed);
        res = await fetch("/api/analyze-file", { method: "POST", body: fd });
      } else {
        // Docs/text: upload to Supabase Storage first to bypass body size limits
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Unauthorized");

        const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(TEMP_BUCKET)
          .upload(storagePath, pf.file, { contentType: pf.file.type });

        if (uploadError) throw new Error(uploadError.message);

        const fd = new FormData();
        fd.set("storagePath", storagePath);
        fd.set("fileName", pf.file.name);
        res = await fetch("/api/analyze-file", { method: "POST", body: fd });
      }

      const json = await res.json() as { extractedText?: string; charCount?: number; error?: string; message?: string };
      if (json.error === "SCANNED_PDF") {
        const updated: ProcessedFile = { ...pf, status: "scanned_pdf" };
        setFiles((prev) => prev.map((f) => f.file === pf.file ? updated : f));
        return updated;
      }
      if (json.error || !res.ok) throw new Error(json.error ?? "Failed");
      const updated: ProcessedFile = { ...pf, status: "done", charCount: json.charCount, extractedText: json.extractedText };
      setFiles((prev) => prev.map((f) => f.file === pf.file ? updated : f));
      return updated;
    } catch {
      setFiles((prev) => prev.map((f) => f.file === pf.file ? { ...f, status: "error" } : f));
      return { ...pf, status: "error" };
    }
  }

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

    const rawFiles = Array.from(list);
    const merged = [...files, ...rawFiles.map((f): ProcessedFile => ({ file: f, status: "pending" }))];

    const totalSize = merged.reduce((s, pf) => s + pf.file.size, 0);
    if (totalSize > TOTAL_MAX) { setFileError(labels.aiImportErrorTotalTooLarge!); return; }

    setFiles(merged);

    // Kick off analysis for newly added files
    for (const f of rawFiles) {
      const pf: ProcessedFile = { file: f, status: "pending" };
      analyzeFile(pf);
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!hasContent) { setFileError(labels.aiImportErrorNoContent!); return; }

    setStatus("loading");
    setErrorMsg(null);
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);

    const fd = new FormData();
    fd.set("courseTitle",        courseTitle);
    fd.set("sourceLanguage",     sourceLanguage);
    fd.set("targetLanguage",     targetLanguage);
    fd.set("category",           category);
    fd.set("level",              level);
    fd.set("sectionTitle",       sectionTitle);
    fd.set("sectionDescription", sectionDescription);
    fd.set("cardStyle",          cardStyle);
    fd.set("count",              String(Math.min(50, Math.max(1, parseInt(count) || 10))));
    fd.set("focusInstruction",   focus);
    fd.set("pastedText",         pastedText);

    // Combine all pre-extracted texts and send as one field — avoids re-running OCR/parsing
    const preExtractedText = files
      .filter((pf) => pf.status === "done" && pf.extractedText)
      .map((pf) => pf.extractedText!)
      .join("\n");

    if (preExtractedText) {
      fd.set("preExtractedText", preExtractedText);
    } else {
      // Fallback: send raw files if analysis didn't complete
      for (const pf of files) fd.append("files", pf.file);
    }

    const result = await generateCardsWithAI(fd);

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    if ("error" in result) {
      setStatus("error");
      setErrorMsg(result.error);
      return;
    }

    if (result.remainingChars !== undefined) showQuotaToast("chars", result.remainingChars);
    onImport(result.cards);
    onClose();
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && !isBusy && onClose()}
    >
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="ai-import-title" className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-paper shadow-hard">

        {/* Busy overlay — greys out the entire modal while analyzing or generating */}
        {isBusy && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-ink/60 backdrop-blur-sm">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-paper/30 border-t-orange" />
            <p className="font-manrope text-sm font-[700] text-paper">
              {status === "loading"
                ? (() => {
                    const remaining = estimatedSeconds - elapsedSeconds;
                    return remaining > 0 ? `Generating cards… ~${remaining}s` : "Almost done…";
                  })()
                : "Analyzing files…"}
            </p>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
          <h2 id="ai-import-title" className="font-fredoka text-xl font-[700] tracking-tight">{labels.aiImportTitle}</h2>
          <button type="button" onClick={onClose} aria-label="Close" disabled={isBusy} className="font-manrope text-sm text-ink-3 hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed">✕</button>
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
                aria-label={labels.aiImportCardStyle}
                className="w-full rounded-md bg-paper-2 px-4 py-3 font-manrope text-sm text-ink outline-none focus:ring-2 focus:ring-ink appearance-none"
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
                onChange={(e) => setCount(e.target.value)}
                onBlur={(e) => {
                  const n = parseInt(e.target.value);
                  const clamped = Math.min(50, Math.max(1, isNaN(n) ? 10 : n));
                  setCount(String(clamped));
                  setCountError(!isNaN(n) && n > 50 ? "Maximum is 50 cards per import." : null);
                }}
                aria-label={labels.aiImportCount}
                className="w-full rounded-md bg-paper-2 px-4 py-3 font-manrope text-sm text-ink outline-none focus:ring-2 focus:ring-ink"
              />
              {countError && (
                <p className="mt-1.5 font-manrope text-xs text-orange-text">{countError}</p>
              )}
              <p className="mt-1.5 font-manrope text-xs text-ink-3">
                Max 50 cards. The AI may return fewer if it feels the source content has been exhausted.
              </p>
            </div>

            {/* Focus instruction */}
            <div>
              {lbl(labels.aiImportFocus!, true)}
              <input
                type="text"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder={labels.aiImportFocusPlaceholder}
                aria-label={labels.aiImportFocus}
                className="w-full rounded-md bg-paper-2 px-4 py-3 font-manrope text-sm text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-ink"
              />
            </div>

            {/* Source content */}
            <div>
              {lbl(labels.aiImportSourceContent!)}

              {/* Supported file types */}
              <div className="mb-3 rounded-md bg-paper-2 px-4 py-3 flex flex-col gap-2">
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-ink-3 mb-1">Images</p>
                    <p className="font-manrope text-xs text-ink-2">JPG, PNG, GIF, WebP · max 20 MB each · OCR</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-ink-3 mb-1">Documents &amp; Data</p>
                    <p className="font-manrope text-xs text-ink-2">PDF (text only, not scanned), DOCX, XLSX, TXT, MD, CSV, JSON · max 50 MB</p>
                  </div>
                </div>
                <p className="font-manrope text-[11px] text-ink-3 border-t border-ink/10 pt-2">
                  Total upload limit 100 MB · 100,000 chars processed · Color highlights not detected
                </p>
              </div>

              {/* File upload */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_ATTR}
                className="hidden"
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
              />
              {(() => {
                const totalChars = pastedText.trim().length + files.filter((pf) => pf.status === "done").reduce((s, pf) => s + (pf.charCount ?? 0), 0);
                const atCharCap = totalChars > 100_000;
                return (
                  <button
                    type="button"
                    onClick={() => !atCharCap && fileInputRef.current?.click()}
                    disabled={atCharCap}
                    className={`mb-3 w-full rounded-md border-2 border-dashed py-3 font-manrope text-sm font-[700] transition ${
                      atCharCap
                        ? "border-ink/10 text-ink-3 cursor-not-allowed opacity-50"
                        : "border-ink/20 text-ink-2 hover:border-orange hover:text-orange-text"
                    }`}
                  >
                    {atCharCap ? "Character limit reached" : labels.aiImportUploadFile}
                  </button>
                );
              })()}

              {/* File list */}
              {files.length > 0 && (
                <div className="mb-3 flex flex-col gap-1.5">
                  {files.map((pf, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md bg-paper-2 px-3 py-2 gap-2">
                      <span className="truncate font-mono text-xs text-ink-2 min-w-0">{pf.file.name} · {fmt(pf.file.size)}</span>
                      <span className="shrink-0 font-mono text-xs tabular-nums">
                        {pf.status === "processing"  && <span className="text-ink-3 animate-pulse">analyzing…</span>}
                        {pf.status === "done"        && pf.charCount !== undefined && <span className="text-ink-2">{fmtChars(pf.charCount)} chars</span>}
                        {pf.status === "scanned_pdf" && <span className="text-orange-text">scanned PDF</span>}
                        {pf.status === "error"       && <span className="text-orange-text">failed</span>}
                        {pf.status === "pending"     && <span className="text-ink-3">—</span>}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setFiles(files.filter((_, j) => j !== i)); setFileError(null); }}
                        className="shrink-0 font-manrope text-xs text-ink-3 hover:text-orange-text"
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
                className="w-full resize-none rounded-md bg-paper-2 px-4 py-3 font-manrope text-sm text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-ink"
              />
            </div>

            {/* Document size indicator */}
            {hasContent && (
              <div className="rounded-md border border-ink/10 bg-paper-2 px-4 py-3 flex flex-col gap-1.5">
                <p className="font-mono text-xs uppercase tracking-widest text-ink-3">Document size</p>

                {/* Pasted text — exact */}
                {pastedText.trim().length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="font-manrope text-xs text-ink-2">Pasted text</span>
                    <span className="font-manrope text-xs font-[700] text-ink tabular-nums">
                      {fmtChars(pastedText.trim().length)} chars
                    </span>
                  </div>
                )}

                {/* Files — real char counts from server analysis */}
                {files.map((pf, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="truncate font-manrope text-xs text-ink-2 max-w-[55%]">{pf.file.name}</span>
                    <span className="font-manrope text-xs font-[700] tabular-nums shrink-0">
                      {pf.status === "processing"  && <span className="text-ink-3 font-normal animate-pulse">analyzing…</span>}
                      {pf.status === "done"        && <span className="text-ink">{fmtChars(pf.charCount ?? 0)} chars</span>}
                      {pf.status === "scanned_pdf" && <span className="text-orange-text font-normal">scanned — not supported</span>}
                      {pf.status === "error"       && <span className="text-orange-text font-normal">extraction failed</span>}
                      {pf.status === "pending"     && <span className="text-ink-3 font-normal">—</span>}
                    </span>
                  </div>
                ))}

                {/* Total + cap warning */}
                {(() => {
                  const doneChars = files.filter((pf) => pf.status === "done").reduce((s, pf) => s + (pf.charCount ?? 0), 0);
                  const total = pastedText.trim().length + doneChars;
                  const overCap = total > 100_000;
                  const showTotal = (files.length > 0 && pastedText.trim().length > 0) || files.length > 1;
                  const totalLabel = files.some((pf) => pf.status !== "done") ? "Total (partial)" : "Total";
                  return (
                    <>
                      {showTotal && (
                        <div className="flex items-center justify-between border-t border-ink/10 pt-1.5 mt-0.5">
                          <span className="font-manrope text-xs font-[700] text-ink-2">{totalLabel}</span>
                          <span className={`font-manrope text-xs font-[700] tabular-nums ${overCap ? "text-orange" : "text-ink"}`}>
                            ~{fmtChars(total)} chars
                          </span>
                        </div>
                      )}
                      {overCap && (
                        <p className="mt-1 font-manrope text-xs text-orange">
                          ⚠️ Content exceeds 100,000 chars — only the first 100K will be processed.
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Scanned PDF warning */}
            {files.some((pf) => pf.status === "scanned_pdf") && (
              <div className="rounded-md border border-orange/40 bg-orange/10 px-4 py-3">
                <p className="font-manrope text-sm font-[700] text-ink">⚠️ Scanned PDF detected</p>
                <p className="mt-1 font-manrope text-xs text-ink-2">
                  This PDF contains scanned pages with no text layer and cannot be read. Please convert the pages to images (JPG or PNG) and upload those instead.
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
          <button type="button" onClick={onClose} disabled={isBusy} className="font-manrope text-sm font-[800] text-ink-2 hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed">
            {labels.aiImportCancel}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={status === "loading" || !hasContent || files.some((pf) => pf.status === "processing" || pf.status === "pending" || pf.status === "scanned_pdf")}
            className="rounded-full bg-orange px-5 py-2.5 font-manrope text-sm font-[800] text-on-bright shadow-hard-red transition hover:opacity-90 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "loading"
              ? (() => {
                  const remaining = estimatedSeconds - elapsedSeconds;
                  if (remaining > 0) return `Generating… ~${remaining}s`;
                  return "Almost done…";
                })()
              : files.some((pf) => pf.status === "processing" || pf.status === "pending")
              ? "Analyzing…"
              : labels.aiImportGenerate}
          </button>
        </div>

      </div>
    </div>
  );
}
