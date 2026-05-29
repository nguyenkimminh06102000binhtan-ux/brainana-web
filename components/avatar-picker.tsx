"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { compressImage } from "@/utils/compress-image";

const PRESETS = Array.from({ length: 10 }, (_, i) => `/avatars/preset-${i + 1}.svg`);
const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type AvatarPickerProps = {
  userId: string;
  value: string | null;
  onChange: (url: string) => void;
};

export default function AvatarPicker({ userId, value, onChange }: AvatarPickerProps) {
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!IMAGE_TYPES.includes(file.type)) {
      setUploadError("Only JPEG, PNG, and WebP images are supported.");
      return;
    }

    setUploadError(null);

    if (file.size > MAX_FILE_BYTES) {
      setCompressing(true);
    } else {
      setUploading(true);
    }

    try {
      const compressed = await compressImage(file, MAX_FILE_BYTES);
      setCompressing(false);
      setUploading(true);
      const ext = compressed.name.split(".").pop()?.toLowerCase() ?? "webp";
      const path = `${userId}/avatar.${ext}`;
      const supabase = createClient();

      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, { upsert: true, contentType: compressed.type });

      if (error) {
        setUploadError(error.message);
        setUploading(false);
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      // Bust cache so the browser fetches the new image
      onChange(`${data.publicUrl}?t=${Date.now()}`);
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setCompressing(false);
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-5">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-paper-2 shadow-hard-sm">
          {value ? (
            <Image src={value} alt="Your avatar" fill sizes="64px" className="object-cover" unoptimized={value.startsWith("/")} />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-2xl">?</span>
          )}
        </div>

        <div>
          <p className="font-manrope text-sm font-[700] text-ink">
            Pick a preset or upload your own
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || compressing}
            className="mt-1 font-manrope text-xs font-[700] text-ink-2 underline underline-offset-2 disabled:opacity-50"
          >
            {compressing ? "Processing…" : uploading ? "Uploading…" : "Upload image"}
          </button>
          {compressing && (
            <p className="mt-1 font-manrope text-xs text-ink-2">Image is large — compressing before upload, please wait…</p>
          )}
          {uploadError && (
            <p className="mt-1 font-manrope text-xs text-orange-text">{uploadError}</p>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        {PRESETS.map((src) => {
          const selected = value === src;
          return (
            <button
              key={src}
              type="button"
              onClick={() => onChange(src)}
              className={`relative h-12 w-12 overflow-hidden rounded-full transition ${
                selected
                  ? "ring-2 ring-blue ring-offset-2"
                  : "opacity-70 hover:opacity-100"
              }`}
              aria-pressed={selected}
            >
              <Image src={src} alt="Preset avatar" fill className="object-cover" unoptimized />
            </button>
          );
        })}
      </div>
    </div>
  );
}
