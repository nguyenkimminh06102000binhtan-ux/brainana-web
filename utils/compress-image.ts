export async function compressImage(file: File, maxBytes: number, maxDim?: number): Promise<File> {
  if (file.size <= maxBytes && !maxDim) return file;

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { naturalWidth: w, naturalHeight: h } = img;
      if (maxDim && (w > maxDim || h > maxDim)) {
        if (w >= h) { h = Math.round((h / w) * maxDim); w = maxDim; }
        else        { w = Math.round((w / h) * maxDim); h = maxDim; }
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas unavailable")); return; }
      ctx.drawImage(img, 0, 0, w, h);

      const outputName = file.name.replace(/\.[^.]+$/, ".webp");
      let quality = 0.9;

      function attempt() {
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error("Compression failed")); return; }
            if (blob.size <= maxBytes || quality <= 0.1) {
              resolve(new File([blob], outputName, { type: "image/webp" }));
            } else {
              quality = Math.round((quality - 0.1) * 10) / 10;
              attempt();
            }
          },
          "image/webp",
          quality,
        );
      }

      attempt();
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for compression"));
    };

    img.src = objectUrl;
  });
}
