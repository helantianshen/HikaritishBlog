"use client";

import {
  Album,
  Article,
  ArticleRevision,
  Asset,
  Friend,
  PagedResult,
  Project,
  SiteSettings,
} from "./types";

interface Envelope<T> {
  data: T;
}

interface ErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
  };
}

export class AdminAPIError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "AdminAPIError";
    this.status = status;
    this.code = code;
  }
}

const tokenKey = "hikaritish-admin-token";

export function getAdminToken() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(tokenKey) || "";
}

export function setAdminToken(token: string) {
  if (typeof window === "undefined") return;
  const value = token.trim();
  if (value) {
    window.sessionStorage.setItem(tokenKey, value);
  } else {
    window.sessionStorage.removeItem(tokenKey);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  const token = getAdminToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`/api/v1/admin${path}`, {
    ...init,
    cache: "no-store",
    headers,
  });
  if (!response.ok) {
    let body: ErrorEnvelope = {};
    try {
      body = (await response.json()) as ErrorEnvelope;
    } catch {
      // The status code still gives the caller a useful error.
    }
    throw new AdminAPIError(
      response.status,
      body.error?.code || "request_failed",
      body.error?.message || `请求失败（${response.status}）`,
    );
  }
  if (response.status === 204) return undefined as T;
  const payload = (await response.json()) as Envelope<T>;
  return payload.data;
}

export const adminAPI = {
  articles(params = "") {
    return request<PagedResult<Article>>(`/articles${params}`);
  },
  article(id: number) {
    return request<Article>(`/articles/${id}`);
  },
  createArticle(input: ArticleWriteInput) {
    return request<Article>("/articles", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  updateArticle(id: number, input: ArticleWriteInput) {
    return request<Article>(`/articles/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },
  publishArticle(id: number) {
    return request<Article>(`/articles/${id}/publish`, { method: "POST" });
  },
  unpublishArticle(id: number) {
    return request<Article>(`/articles/${id}/unpublish`, { method: "POST" });
  },
  deleteArticle(id: number) {
    return request<void>(`/articles/${id}`, { method: "DELETE" });
  },
  articleRevisions(id: number) {
    return request<ArticleRevision[]>(`/articles/${id}/revisions`);
  },
  settings() {
    return request<SiteSettings>("/settings");
  },
  updateSettings(input: SiteSettings) {
    return request<SiteSettings>("/settings", {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },
  friends() {
    return request<Friend[]>("/friends");
  },
  saveFriend(input: Omit<Friend, "id"> & { id?: number }) {
    return request<Friend>(input.id ? `/friends/${input.id}` : "/friends", {
      method: input.id ? "PUT" : "POST",
      body: JSON.stringify(input),
    });
  },
  deleteFriend(id: number) {
    return request<void>(`/friends/${id}`, { method: "DELETE" });
  },
  projects() {
    return request<Project[]>("/projects");
  },
  saveProject(input: Omit<Project, "id"> & { id?: number }) {
    return request<Project>(input.id ? `/projects/${input.id}` : "/projects", {
      method: input.id ? "PUT" : "POST",
      body: JSON.stringify(input),
    });
  },
  deleteProject(id: number) {
    return request<void>(`/projects/${id}`, { method: "DELETE" });
  },
  albums() {
    return request<Album[]>("/albums");
  },
  saveAlbum(input: Omit<Album, "id"> & { id?: number }) {
    return request<Album>(input.id ? `/albums/${input.id}` : "/albums", {
      method: input.id ? "PUT" : "POST",
      body: JSON.stringify(input),
    });
  },
  deleteAlbum(id: number) {
    return request<void>(`/albums/${id}`, { method: "DELETE" });
  },
  assets(page = 1) {
    return request<PagedResult<Asset>>(`/assets?page=${page}&pageSize=60`);
  },
  deleteAsset(id: number) {
    return request<void>(`/assets/${id}`, { method: "DELETE" });
  },
  async uploadImage(file: File): Promise<Asset> {
    const upload = await request<PresignedUpload>("/assets/presign", {
      method: "POST",
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      }),
    });
    const putResponse = await fetch(upload.uploadUrl, {
      method: "PUT",
      headers: upload.headers,
      body: file,
    });
    if (!putResponse.ok) {
      throw new AdminAPIError(
        putResponse.status,
        "upload_failed",
        `上传到 RustFS 失败（${putResponse.status}）`,
      );
    }
    const dimensions = await imageDimensions(file);
    return request<Asset>("/assets/complete", {
      method: "POST",
      body: JSON.stringify({
        objectKey: upload.objectKey,
        originalName: file.name,
        width: dimensions.width,
        height: dimensions.height,
      }),
    });
  },
};

export interface ArticleWriteInput {
  kind: Article["kind"];
  slug: string;
  title: string;
  summary: string;
  mood: string;
  location: string;
  coverUrl: string;
  tags: string[];
  imageUrls: string[];
  contentHtml: string;
}

interface PresignedUpload {
  objectKey: string;
  uploadUrl: string;
  publicUrl: string;
  headers: Record<string, string>;
  expiresAt: string;
}

async function imageDimensions(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  } catch {
    return { width: 0, height: 0 };
  }
}
