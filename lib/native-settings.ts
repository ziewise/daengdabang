import { registerPlugin } from "@capacitor/core";

// Keep the existing Android plugin name for compatibility with released APKs.
// Register once: location and media recovery share the same settings activity.
export const NativeSettings = registerPlugin<{
    open(options: { target: "app" | "location" }): Promise<void>;
}>("LocationSettings");
