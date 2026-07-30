"use client";

import { createContext, useContext, useMemo } from "react";
import { SiteSettings, defaultSiteSettings } from "@/lib/types";

const SiteSettingsContext = createContext<SiteSettings>(defaultSiteSettings);

export function SiteSettingsProvider({
  settings,
  children,
}: {
  settings: SiteSettings;
  children: React.ReactNode;
}) {
  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}

export function useLegacySiteConfig() {
  const settings = useSiteSettings();
  return useMemo(() => {
    const social = Object.fromEntries(
      settings.socialLinks.map((item) => [
        (item.icon || item.label).toLowerCase(),
        item.url,
      ]),
    ) as Record<string, string>;

    return {
      title: settings.siteTitle,
      faviconUrl: settings.faviconUrl,
      authorName: settings.authorName,
      bio: settings.bio,
      navTitle: settings.navTitle,
      navSuffix: settings.navSuffix,
      navAfter: settings.navAfter,
      navItems: settings.navItems,
      avatarUrl: settings.avatarUrl,
      useGradient: settings.useGradient,
      themeColors: settings.themeColors,
      bgImages: settings.backgroundImages,
      defaultPostCover: settings.defaultPostCoverUrl,
      photoWallImage: settings.photoWallCoverUrl,
      cloudMusicIds: settings.musicIds,
      social,
      chatterTitle: settings.chatterTitle,
      chatterDescription: settings.chatterDescription,
      danmakuList: settings.danmakuList,
      gitalkConfig: {
        clientID: settings.publicComment.clientId,
        clientSecret: "server-managed",
        repo: settings.publicComment.repo,
        owner: settings.publicComment.owner,
        admin: settings.publicComment.admins,
        enabled: settings.publicComment.enabled,
      },
      buildDate: settings.buildDate,
      footerBadges: settings.footerBadges,
      icpConfig:
        settings.icpNumber || settings.icpLink
          ? { name: settings.icpNumber, link: settings.icpLink }
          : null,
      friendLinkApplyFormat: settings.friendApplyFormat,
      enableLevelSystem: settings.enableLevelSystem,
      enableMusicPlayer: settings.enableMusicPlayer,
      enableDanmaku: settings.enableDanmaku,
    };
  }, [settings]);
}

export function socialURL(settings: SiteSettings, key: string) {
  const normalized = key.toLowerCase();
  return (
    settings.socialLinks.find(
      (item) =>
        item.icon.toLowerCase() === normalized ||
        item.label.toLowerCase() === normalized,
    )?.url || ""
  );
}
