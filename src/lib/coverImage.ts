const MAX_HEIGHT = 640;
const MAX_LENGTH = 350_000;

/** Turns an uploaded cover into a small JPEG data URL, so it can live in the game's Firestore document. */
export async function resizeCover(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_HEIGHT / bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const quality of [0.82, 0.7, 0.55]) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length <= MAX_LENGTH) return dataUrl;
  }

  throw new Error("Cover image is too large even after resizing");
}
