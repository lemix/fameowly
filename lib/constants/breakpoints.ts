/** Mobile ↔ desktop layout switch. Must stay in sync with Tailwind's `md` prefix. */
export const MOBILE_BREAKPOINT = 768;

/** Viewports where the mobile layout (overlay sidebar, bottom sheets) is active. */
export const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;
