/**
 * Premium stub — loaded when premium/ submodule is not present.
 * Exports an empty plugin array so the loader bridge is a no-op.
 */

import type { PremiumPlugin } from "./types";

export const plugins: PremiumPlugin[] = [];
