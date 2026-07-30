export type ArticleKind = "post" | "chatter" | "moment" | "page";
export type ArticleStatus = "draft" | "published" | "archived";

export interface Article {
  id: number;
  kind: ArticleKind;
  status?: ArticleStatus;
  slug: string;
  title: string;
  summary: string;
  mood: string;
  location: string;
  coverUrl: string;
  tags: string[];
  imageUrls: string[];
  contentHtml?: string;
  renderedHtml: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleRevision {
  id: number;
  articleId: number;
  revision: number;
  title: string;
  summary: string;
  coverUrl: string;
  tags: string[];
  imageUrls: string[];
  contentHtml: string;
  renderedHtml: string;
  createdAt: string;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface SocialLink {
  label: string;
  url: string;
  icon: string;
}

export interface FooterBadge {
  label: string;
  url: string;
  image: string;
}

export interface PublicCommentConfig {
  enabled: boolean;
  owner: string;
  repo: string;
  clientId: string;
  admins: string[];
}

export interface AssistantConfig {
  enabled: boolean;
  modelId: string;
  systemPrompt: string;
  maxOutputTokens: number;
  temperature: number;
}

export interface SiteSettings {
  id: number;
  siteTitle: string;
  faviconUrl: string;
  authorName: string;
  bio: string;
  avatarUrl: string;
  navTitle: string;
  navSuffix: string;
  navAfter: string;
  navItems: NavItem[];
  socialLinks: SocialLink[];
  useGradient: boolean;
  themeColors: string[];
  backgroundImages: string[];
  defaultPostCoverUrl: string;
  photoWallCoverUrl: string;
  musicIds: string[];
  danmakuList: string[];
  footerBadges: FooterBadge[];
  icpNumber: string;
  icpLink: string;
  chatterTitle: string;
  chatterDescription: string;
  friendApplyFormat: string;
  publicComment: PublicCommentConfig;
  assistant: AssistantConfig;
  enableLevelSystem: boolean;
  enableMusicPlayer: boolean;
  enableDanmaku: boolean;
  buildDate: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Friend {
  id: number;
  name: string;
  url: string;
  avatarUrl: string;
  description: string;
  themeColor: string;
  sortOrder: number;
  visible: boolean;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  url: string;
  repoUrl: string;
  coverUrl: string;
  icon: string;
  tags: string[];
  sortOrder: number;
  visible: boolean;
}

export interface Photo {
  id?: number;
  albumId?: number;
  url: string;
  thumbnailUrl: string;
  alt: string;
  caption: string;
  takenAt: string | null;
  sortOrder: number;
}

export interface Album {
  id: number;
  slug: string;
  name: string;
  description: string;
  coverUrl: string;
  displayDate: string;
  sortOrder: number;
  visible: boolean;
  photos: Photo[];
}

export interface Asset {
  id: number;
  objectKey: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  originalName: string;
  createdAt: string;
}

export const defaultSiteSettings: SiteSettings = {
  id: 1,
  siteTitle: "My Blog",
  faviconUrl: "",
  authorName: "Author",
  bio: "",
  avatarUrl: "",
  navTitle: "BLOG",
  navSuffix: "",
  navAfter: "",
  navItems: [
    { label: "首页", href: "/" },
    { label: "文章", href: "/timeline" },
    { label: "关于", href: "/about" },
  ],
  socialLinks: [],
  useGradient: true,
  themeColors: ["#a18cd1", "#fbc2eb", "#a1c4fd", "#c2e9fb"],
  backgroundImages: [],
  defaultPostCoverUrl: "",
  photoWallCoverUrl: "",
  musicIds: [],
  danmakuList: [],
  footerBadges: [],
  icpNumber: "",
  icpLink: "",
  chatterTitle: "杂谈",
  chatterDescription: "日常碎片与灵感记录",
  friendApplyFormat: "",
  publicComment: {
    enabled: false,
    owner: "",
    repo: "",
    clientId: "",
    admins: [],
  },
  assistant: {
    enabled: false,
    modelId: "gemini-2.5-flash-lite",
    systemPrompt: "",
    maxOutputTokens: 150,
    temperature: 0.85,
  },
  enableLevelSystem: false,
  enableMusicPlayer: false,
  enableDanmaku: false,
  buildDate: null,
};
