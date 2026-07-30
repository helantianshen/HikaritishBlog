import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/public-api";
import MusicClient from "./MusicClient";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `音乐馆 | ${settings.siteTitle}`,
  };
}

export default function MusicPage() {
  return <MusicClient />;
}
