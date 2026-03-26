export interface FsNode {
  name: string;
  path: string; // like "/folder/file.md"
  type: 'file' | 'folder';
  fileType?: 'markdown' | 'database' | 'canvas' | 'html' | 'code' | 'file';
  children?: FsNode[];
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

export async function getTree(path: string = '/'): Promise<FsNode> {
  return request<FsNode>(`${API_BASE}/tree?path=${encodeURIComponent(path)}`);
}

export async function getFile(path: string): Promise<{ path: string; content: string }> {
  return request<{ path: string; content: string }>(`${API_BASE}/file?path=${encodeURIComponent(path)}`);
}

export async function createFile(path: string, content: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`${API_BASE}/file`, {
    method: 'POST',
    body: JSON.stringify({ path, content }),
  });
}

export async function writeFile(path: string, content: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`${API_BASE}/file`, {
    method: 'PUT',
    body: JSON.stringify({ path, content }),
  });
}

export async function createFolder(path: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`${API_BASE}/folder`, {
    method: 'POST',
    body: JSON.stringify({ path }),
  });
}

export async function deletePath(path: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`${API_BASE}/path?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
}

export async function movePath(from: string, to: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`${API_BASE}/move`, {
    method: 'POST',
    body: JSON.stringify({ from, to }),
  });
}

