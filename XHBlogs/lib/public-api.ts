import {
  Album,
  Article,
  ArticleKind,
  Friend,
  PagedResult,
  Project,
  SiteSettings,
  defaultSiteSettings,
} from "./types";

interface Envelope<T> {
  data: T;
}

function apiBaseURL() {
  return (process.env.API_INTERNAL_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
}

async function publicFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseURL()}/api/v1/public${path}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Public API ${path} returned ${response.status}`);
  }
  const payload = (await response.json()) as Envelope<T>;
  return payload.data;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    return await publicFetch<SiteSettings>("/settings");
  } catch (error) {
    console.error("读取站点设置失败，将使用安全默认值", error);
    return defaultSiteSettings;
  }
}

export async function getArticles(
  kind?: ArticleKind,
  pageSize = 100,
  includeContent = false,
): Promise<PagedResult<Article>> {
  const params = new URLSearchParams({
    page: "1",
    pageSize: String(pageSize),
  });
  if (kind) params.set("kind", kind);
  if (includeContent) params.set("includeContent", "true");
  try {
    return await publicFetch<PagedResult<Article>>(`/articles?${params.toString()}`);
  } catch (error) {
    console.error("读取内容列表失败", error);
    return { items: [], page: 1, pageSize, total: 0 };
  }
}

export async function getArticle(slug: string): Promise<Article | null> {
  try {
    return await publicFetch<Article>(`/articles/${encodeURIComponent(slug)}`);
  } catch (error) {
    console.error(`读取内容 ${slug} 失败`, error);
    return null;
  }
}

export async function getFriends(): Promise<Friend[]> {
  try {
    return await publicFetch<Friend[]>("/friends");
  } catch (error) {
    console.error("读取友链失败", error);
    return [];
  }
}

export async function getProjects(): Promise<Project[]> {
  try {
    return await publicFetch<Project[]>("/projects");
  } catch (error) {
    console.error("读取项目失败", error);
    return [];
  }
}

export async function getAlbums(): Promise<Album[]> {
  try {
    return await publicFetch<Album[]>("/albums");
  } catch (error) {
    console.error("读取相册失败", error);
    return [];
  }
}
