export async function compressImage(file: File, maxBytes: number): Promise<File> {
  if (file.size <= maxBytes) return file;

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas unavailable")); return; }
      ctx.drawImage(img, 0, 0);

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
