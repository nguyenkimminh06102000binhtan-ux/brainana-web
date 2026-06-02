import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { rateLimitUser } from "@/utils/rate-limit";
import { aiExtractTextFromImage } from "@/utils/ai-client";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
const TEMP_BUCKET = "temp-uploads";

function toImageMediaType(ext: string) {
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg" as const;
  if (ext === "png")  return "image/png"  as const;
  if (ext === "gif")  return "image/gif"  as const;
  return "image/webp" as const;
}

async function extractText(bytes: Buffer, ext: string): Promise<string> {
  if (IMAGE_EXTENSIONS.has(ext)) {
    return aiExtractTextFromImage(bytes, toImageMediaType(ext));
  }

  if (ext === "pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(bytes);
    const charCount = data.text.trim().length;
    // Scanned PDFs have no text layer — detect by chars-per-byte ratio.
    // A real text PDF yields at least 1 char per 1,000 bytes.
    const ratio = charCount / bytes.length;
    if (ratio < 0.001) {
      throw new Error("SCANNED_PDF");
    }
    return data.text;
  }

  if (ext === "docx") {
    const mammoth = (await import("mammoth")).default;
    const { value } = await mammoth.extractRawText({ buffer: bytes });
    return value;
  }

  if (ext === "xlsx") {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(bytes, { type: "buffer" });
    return wb.SheetNames
      .map((name) => XLSX.utils.sheet_to_csv(wb.Sheets[name]!))
      .join("\n");
  }

  if (["txt", "md", "csv", "json"].includes(ext)) {
    return bytes.toString("utf-8");
  }

  return "";
}

export async function POST(req: NextRequest) {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimitUser(user.id, "analyze-file", { limit: 20, windowSeconds: 3600 });
  if (!rl.allowed) return Response.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });

  const formData = await req.formData();

  // ── Path A: large file uploaded to Supabase Storage first ────────────────
  const storagePath = formData.get("storagePath") as string | null;
  const fileName    = formData.get("fileName")    as string | null;

  if (storagePath && fileName) {
    const ext = fileName.toLowerCase().split(".").pop() ?? "";

    try {
      // Download from temp storage
      const { data, error } = await supabase.storage
        .from(TEMP_BUCKET)
        .download(storagePath);

      if (error || !data) {
        return Response.json({ error: "Failed to download temp file" }, { status: 500 });
      }

      const bytes = Buffer.from(await data.arrayBuffer());
      const extractedText = await extractText(bytes, ext);

      // Delete temp file regardless of outcome
      await supabase.storage.from(TEMP_BUCKET).remove([storagePath]);

      return Response.json({ extractedText, charCount: extractedText.trim().length });
    } catch (err) {
      // Always attempt cleanup
      await supabase.storage.from(TEMP_BUCKET).remove([storagePath]).catch(() => {});

      if (err instanceof Error && err.message === "SCANNED_PDF") {
        return Response.json({
          error: "SCANNED_PDF",
          message: "This PDF appears to be scanned and has no text layer. Please convert its pages to images (JPG or PNG) and upload those instead.",
        }, { status: 422 });
      }
      console.error("[analyze-file] storage path extraction failed:", err);
      return Response.json({ error: "Failed to extract text from file" }, { status: 500 });
    }
  }

  // ── Path B: small file uploaded directly (images, compressed client-side) ─
  const file = formData.get("file") as File | null;
  if (!file) return Response.json({ error: "No file provided" }, { status: 400 });

  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const extractedText = await extractText(bytes, ext);
    return Response.json({ extractedText, charCount: extractedText.trim().length });
  } catch (err) {
    if (err instanceof Error && err.message === "SCANNED_PDF") {
      return Response.json({
        error: "SCANNED_PDF",
        message: "This PDF appears to be scanned and has no text layer. Please convert its pages to images (JPG or PNG) and upload those instead.",
      }, { status: 422 });
    }
    console.error("[analyze-file] direct upload extraction failed:", err);
    return Response.json({ error: "Failed to extract text from file" }, { status: 500 });
  }
}
