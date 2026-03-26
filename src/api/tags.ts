export interface TagCount {
  name: string;
  count: number;
}

export interface TagFileRef {
  path: string;
  count: number;
}

const API_BASE = '/api';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || res.statusText);
  }
  return res.json();
}

export function listTags(): Promise<TagCount[]> {
  return request<TagCount[]>(`${API_BASE}/tags`);
}

export function filesForTag(name: string): Promise<TagFileRef[]> {
  return request<TagFileRef[]>(`${API_BASE}/tags/${encodeURIComponent(name)}`);
}

export function tagsForFile(path: string): Promise<string[]> {
  return request<string[]>(`${API_BASE}/file/tags?path=${encodeURIComponent(path)}`);
}


