export const MAX_INNOVATION_IMAGES = 4;
export const MAX_INNOVATION_VIDEOS = 2;
export const MAX_MEDIA_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_MEDIA_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_POSTER_BYTES = 4 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ACCEPTED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm"];
export const ACCEPTED_VIDEO_EXTENSIONS = [".mp4", ".webm"];

export interface ClientValidationError {
  field: "images" | "videos" | "image";
  message: string;
}

function extension(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

export function validateImageClient(file: File): ClientValidationError | null {
  if (
    !ACCEPTED_IMAGE_TYPES.includes(file.type) ||
    !ACCEPTED_IMAGE_EXTENSIONS.includes(extension(file.name))
  ) {
    return {
      field: "images",
      message: `${file.name}: choose a JPG, JPEG, PNG or WebP image.`,
    };
  }
  if (file.size > MAX_MEDIA_IMAGE_BYTES) {
    return {
      field: "images",
      message: `${file.name} is larger than ${formatBytes(MAX_MEDIA_IMAGE_BYTES)}.`,
    };
  }
  return null;
}

export function validateVideoClient(file: File): ClientValidationError | null {
  if (
    !ACCEPTED_VIDEO_TYPES.includes(file.type) ||
    !ACCEPTED_VIDEO_EXTENSIONS.includes(extension(file.name))
  ) {
    return {
      field: "videos",
      message: `${file.name}: choose an MP4 or WebM video.`,
    };
  }
  if (file.size > MAX_MEDIA_VIDEO_BYTES) {
    return {
      field: "videos",
      message: `${file.name} is larger than ${formatBytes(MAX_MEDIA_VIDEO_BYTES)}.`,
    };
  }
  return null;
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : value >= 10 ? 0 : 1)} ${units[index]}`;
}

export function evidencePlaceholderPoster(): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    const context = canvas.getContext("2d");
    if (!context) {
      reject(new Error("Canvas is not available."));
      return;
    }
    context.fillStyle = "#142B4F";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#C9A227";
    context.beginPath();
    context.moveTo(284, 140);
    context.lineTo(284, 220);
    context.lineTo(360, 180);
    context.closePath();
    context.fill();
    context.fillStyle = "#ffffff";
    context.font = "bold 26px sans-serif";
    context.textAlign = "center";
    context.fillText("TIE innovation video", 320, 270);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not create a video poster."));
          return;
        }
        resolve(new File([blob], "video-poster.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.86,
    );
  });
}

/**
 * Generate a poster image from the first available video frame so the public
 * page never downloads the video just to show a thumbnail. Falls back to a
 * branded placeholder if the browser cannot decode the selected file.
 */
export async function generateVideoPoster(file: File): Promise<File> {
  const video = document.createElement("video");
  const url = URL.createObjectURL(file);
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  const cleanup = () => URL.revokeObjectURL(url);
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("Video preview timed out.")), 8000);
      video.onloadeddata = () => {
        window.clearTimeout(timer);
        resolve();
      };
      video.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error("Video preview unavailable."));
      };
    });
    if (video.duration > 0.1) {
      video.currentTime = Math.min(0.1, video.duration / 2);
      await new Promise<void>((resolve) => {
        const timer = window.setTimeout(resolve, 2500);
        video.onseeked = () => {
          window.clearTimeout(timer);
          resolve();
        };
      });
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not available.");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.84),
    );
    if (!blob) throw new Error("Could not create a video poster.");
    if (blob.size > MAX_VIDEO_POSTER_BYTES) {
      return await generatePlaceholderFromCanvas(canvas);
    }
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-poster.jpg`, {
      type: "image/jpeg",
    });
  } catch {
    return evidencePlaceholderPoster();
  } finally {
    video.removeAttribute("src");
    video.load();
    cleanup();
  }
}

function generatePlaceholderFromCanvas(source: HTMLCanvasElement): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    const context = canvas.getContext("2d");
    if (context) {
      context.fillStyle = "#142B4F";
      context.fillRect(0, 0, 640, 360);
      context.drawImage(source, 0, 0, 640, 360);
    }
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(new File([blob], "video-poster.jpg", { type: "image/jpeg" }));
        } else {
          void evidencePlaceholderPoster().then(resolve);
        }
      },
      "image/jpeg",
      0.72,
    );
  });
}
