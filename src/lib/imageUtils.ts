/**
 * Utility to process and compress images uploaded from local devices.
 * Prevents huge raw camera files (e.g. 15MB) from bloating localStorage/DB
 * while preserving high-definition crispness for blog displays.
 */

export interface ProcessedImageResult {
  dataUrl: string;
  name: string;
  size: number;
  width: number;
  height: number;
  mimeType: string;
}

export async function processLocalImageFile(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.85
): Promise<ProcessedImageResult> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Tanlangan fayl rasm formatida emas.'));
    }

    // If it is SVG, read directly as data URL without canvas rasterization
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve({
          dataUrl,
          name: file.name,
          size: file.size,
          width: 800,
          height: 600,
          mimeType: 'image/svg+xml',
        });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Calculate aspect ratio scaling if exceeds maxWidth or maxHeight
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas context could not be created'));
        }

        // Draw image to canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Determine optimal format (prefer webp, fallback to jpeg)
        let outputType = 'image/webp';
        let dataUrl = canvas.toDataURL(outputType, quality);

        // If browser doesn't support webp encoding, fallback to image/jpeg or png
        if (!dataUrl.startsWith('data:image/webp')) {
          outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          dataUrl = canvas.toDataURL(outputType, quality);
        }

        // Approximate byte size of the base64 output
        const base64Data = dataUrl.split(',')[1] || '';
        const size = Math.round((base64Data.length * 3) / 4);

        resolve({
          dataUrl,
          name: file.name,
          size,
          width,
          height,
          mimeType: outputType,
        });
      };

      img.onerror = () => {
        reject(new Error('Rasmni yuklashda xatolik yuz berdi.'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
