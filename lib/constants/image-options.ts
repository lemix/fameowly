// lib/constants/image-options.ts

export interface AspectRatioOption {
  id: string;
  label: string;
  /** SVG icon shape type for visual representation */
  iconType: "landscape-wide" | "landscape" | "square" | "portrait" | "portrait-tall" | "portrait-wide" | "landscape-narrow";
}

export const ASPECT_RATIOS: AspectRatioOption[] = [
  { id: "16:9", label: "16:9", iconType: "landscape-wide" },
  { id: "4:3", label: "4:3", iconType: "landscape" },
  { id: "3:2", label: "3:2", iconType: "landscape-narrow" },
  { id: "1:1", label: "1:1", iconType: "square" },
  { id: "2:3", label: "2:3", iconType: "portrait-wide" },
  { id: "3:4", label: "3:4", iconType: "portrait" },
  { id: "9:16", label: "9:16", iconType: "portrait-tall" },
];

export const RESOLUTIONS = [
  { id: "1K", label: "1K" },
  { id: "2K", label: "2K" },
  { id: "4K", label: "4K" },
];
