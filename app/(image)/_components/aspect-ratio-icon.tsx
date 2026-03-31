import type { AspectRatioOption } from "@/lib/constants/image-options";

interface AspectRatioIconProps {
  type: AspectRatioOption["iconType"];
  active: boolean;
}

/** SVG shape icon for aspect ratio chips */
export function AspectRatioIcon({ type, active }: AspectRatioIconProps) {
  const fill = active ? "rgba(96, 165, 250, 0.3)" : "rgba(100, 116, 139, 0.2)";
  const stroke = active ? "#60a5fa" : "#64748b";

  const shapes: Record<AspectRatioOption["iconType"], { w: number; h: number }> = {
    "landscape-wide": { w: 16, h: 9 },
    "landscape": { w: 14, h: 10.5 },
    "landscape-narrow": { w: 13, h: 9 },
    "square": { w: 12, h: 12 },
    "portrait-wide": { w: 9, h: 13 },
    "portrait": { w: 10.5, h: 14 },
    "portrait-tall": { w: 9, h: 16 },
  };

  const { w, h } = shapes[type];
  const svgW = 20;
  const svgH = 20;
  const x = (svgW - w) / 2;
  const y = (svgH - h) / 2;

  return (
    <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="shrink-0">
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={1.5}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />
    </svg>
  );
}
