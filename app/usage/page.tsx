import { notFound } from "next/navigation";
import { getUiSlots } from "@/lib/plugins";
import { PluginSlot } from "@/lib/plugin-ui";

/** Host for the plugin-provided consumption report. Absent in OSS builds. */
export default function UsagePage() {
  if (!getUiSlots().includes("usage-page")) notFound();

  return <PluginSlot id="usage-page" />;
}
