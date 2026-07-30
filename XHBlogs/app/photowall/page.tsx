import type { Metadata } from "next";
import { getAlbums, getSiteSettings } from "../../lib/public-api";
import PhotoWallClient from "./PhotoWallClient";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return { title: `照片墙 | ${settings.siteTitle}` };
}

export default async function PhotoWallPage() {
  const albums = await getAlbums();
  const viewModels = albums.map((album) => ({
    id: album.slug,
    title: album.name,
    description: album.description,
    cover: album.coverUrl || album.photos[0]?.url || "/window.svg",
    date: album.displayDate,
    photos: album.photos.map((photo) => ({
      url: photo.url,
      caption: photo.caption,
    })),
  }));
  return <PhotoWallClient albums={viewModels} />;
}
