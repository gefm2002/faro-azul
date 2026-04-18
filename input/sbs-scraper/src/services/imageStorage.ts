// Image storage using localStorage (for demo/Netlify deployment without backend)
// Keys: img_{isbn} -> base64 data URL

const PREFIX = 'sbs_img_';

export function storeImage(isbn: string, base64: string): void {
  try {
    localStorage.setItem(`${PREFIX}${isbn}`, base64);
  } catch (e) {
    // Storage full - try to clear oldest
    console.warn('localStorage full, clearing old images');
    clearOldImages();
    try {
      localStorage.setItem(`${PREFIX}${isbn}`, base64);
    } catch {
      console.error('Cannot store image, storage full');
    }
  }
}

export function getImage(isbn: string): string | null {
  return localStorage.getItem(`${PREFIX}${isbn}`);
}

export function getAllStoredISBNs(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) keys.push(key.slice(PREFIX.length));
  }
  return keys;
}

export function clearOldImages(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) keys.push(key);
  }
  // Remove first half
  keys.slice(0, Math.floor(keys.length / 2)).forEach(k => localStorage.removeItem(k));
}

export function clearAllImages(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) keys.push(key);
  }
  keys.forEach(k => localStorage.removeItem(k));
}

export function getStorageUsageMB(): number {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) {
      total += (localStorage.getItem(key)?.length ?? 0);
    }
  }
  return total / 1024 / 1024;
}

// Base64 to Blob for ZIP download
export function base64ToBlob(base64: string): Blob {
  const [header, data] = base64.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch?.[1] ?? 'image/jpeg';
  const byteCharacters = atob(data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray.buffer], { type: mime });
}
