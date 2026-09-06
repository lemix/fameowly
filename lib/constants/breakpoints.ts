/** Mobile ↔ desktop layout switch. Must stay in sync with Tailwind's `md` prefix. */
export const MOBILE_BREAKPOINT = 768;

/** Viewports where the mobile layout (overlay sidebar, bottom sheets) is active. */
export const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

/**
 * Below this *visual* viewport height the sidebar footer collapses to an icon
 * row. Compared against the visual viewport, so an open keyboard triggers it
 * on tall phones too.
 */
export const SIDEBAR_COMPACT_HEIGHT = 800;
