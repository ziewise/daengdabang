"use client";

import { useSyncExternalStore } from "react";
import { ddbApiReady } from "@/lib/customer-api";

const subscribe = () => () => {};
const getServerSnapshot = () => null;
const getClientSnapshot = () => ddbApiReady();

/**
 * API availability can depend on the browser hostname or a local override.
 * Keep the server and hydration snapshots neutral, then expose the browser
 * value after React has attached to the static HTML.
 */
export function useDdbApiReady(): boolean | null {
    return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
