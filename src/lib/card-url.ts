import { appUrl } from "@/lib/ids";

export function cardPageUrl(serial: string, token: string): string {
  const url = new URL(`/card/${serial}`, appUrl());
  url.searchParams.set("t", token);
  return url.toString();
}
