"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";

const PRESETS = Array.from({ length: 10 }, (_, i) => `/avatars/preset-${i + 1}.svg`);
const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

export type AvatarPickerProps = {
  userId: string;
  value: string | null;
  onChange: (url: string) => void;
};

export default function AvatarPicker({ userId, value, onChange }: AvatarPickerProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      setUploadError("Image must be under 5 MB.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${userId}/avatar.${ext}`;
    const supabase = createClient();

    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) {
      setUploadError(error.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    // Bust cache so the browser fetches the new image
    onChange(`${data.publicUrl}?t=${Date.now()}`);
    setUploading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-5">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-paper-2 shadow-hard-sm">
          {value ? (
            <Image src={value} alt="Your avatar" fill className="object-cover" unoptimized={value.startsWith("/")} />
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
            disabled={uploading}
            className="mt-1 font-manrope text-xs font-[700] text-ink-2 underline underline-offset-2 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload image"}
          </button>
          {uploadError && (
            <p className="mt-1 font-manrope text-xs text-orange">{uploadError}</p>
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
