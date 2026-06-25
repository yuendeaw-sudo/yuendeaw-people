"use client";

type CompressOpts = {
  /** max width/height in px (keeps aspect ratio). 2200 ≈ คมพอสำหรับพิมพ์ A4 */
  maxDim?: number;
  /** JPEG quality 0–1 */
  quality?: number;
  /** ไฟล์เล็กกว่านี้ไม่ต้องบีบ (bytes) */
  minBytes?: number;
};

const COMPRESSIBLE = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/**
 * ย่อ + เข้ารหัสรูปใหม่ให้ไฟล์เล็กลงแต่ยังคมพอสำหรับพิมพ์
 * - ไฟล์ที่ไม่ใช่รูป (เช่น PDF) หรือรูปเล็กอยู่แล้ว → คืนไฟล์เดิม
 * - รูปที่ browser ถอดรหัสไม่ได้ (เช่น HEIC บางเครื่อง) → คืนไฟล์เดิม (ไม่พัง)
 */
export async function compressImage(file: File, opts: CompressOpts = {}): Promise<File> {
  const { maxDim = 2200, quality = 0.82, minBytes = 700 * 1024 } = opts;
  if (typeof document === "undefined") return file; // server guard
  if (!COMPRESSIBLE.includes(file.type)) return file; // PDF ฯลฯ — ปล่อยไว้
  if (file.size < minBytes) return file; // เล็กพออยู่แล้ว

  try {
    const img = await loadImage(file);
    const sw = (img as HTMLImageElement).naturalWidth || img.width;
    const sh = (img as HTMLImageElement).naturalHeight || img.height;
    if (!sw || !sh) return file;

    const scale = Math.min(1, maxDim / Math.max(sw, sh));
    const w = Math.round(sw * scale);
    const h = Math.round(sh * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // พื้นขาว กัน PNG โปร่งใสกลายเป็นดำตอนแปลงเป็น JPEG
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img as CanvasImageSource, 0, 0, w, h);
    if ("close" in img && typeof img.close === "function") img.close();

    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file; // ไม่ได้เล็กลง → ใช้ของเดิม

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    return file; // ถอดรหัสไม่ได้ → ใช้ไฟล์เดิม
  }
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      // imageOrientation: from-image → หมุนภาพถ่ายจากมือถือให้ถูกด้าน
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* fall through */
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    const url = URL.createObjectURL(file);
    el.onload = () => {
      URL.revokeObjectURL(url);
      resolve(el);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    el.src = url;
  });
}
