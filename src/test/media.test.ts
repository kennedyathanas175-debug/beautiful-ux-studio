import { describe, expect, it } from "vitest";

import {
  MAX_MEDIA_IMAGE_BYTES,
  MAX_MEDIA_VIDEO_BYTES,
  formatBytes,
  validateImageClient,
  validateVideoClient,
} from "@/lib/media";

function file(name: string, type: string, size = 16): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("innovation media validation", () => {
  it("accepts supported image formats", () => {
    expect(validateImageClient(file("photo.jpg", "image/jpeg"))).toBeNull();
    expect(validateImageClient(file("photo.png", "image/png"))).toBeNull();
    expect(validateImageClient(file("photo.webp", "image/webp"))).toBeNull();
  });

  it("rejects unsupported images and oversized files", () => {
    expect(validateImageClient(file("photo.gif", "image/gif"))?.field).toBe("images");
    const oversized = file("large.jpg", "image/jpeg", MAX_MEDIA_IMAGE_BYTES + 1);
    expect(validateImageClient(oversized)?.message).toContain("larger than");
  });

  it("accepts MP4 and WebM videos", () => {
    expect(validateVideoClient(file("pitch.mp4", "video/mp4"))).toBeNull();
    expect(validateVideoClient(file("demo.webm", "video/webm"))).toBeNull();
  });

  it("rejects other video formats and oversized files", () => {
    expect(validateVideoClient(file("clip.avi", "video/avi"))?.field).toBe("videos");
    const oversized = file("large.mp4", "video/mp4", MAX_MEDIA_VIDEO_BYTES + 1);
    expect(validateVideoClient(oversized)?.message).toContain("larger than");
  });

  it("formats file sizes for people", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(10 * 1024 * 1024)).toBe("10 MB");
  });
});
