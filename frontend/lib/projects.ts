import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  _count?: { chats: number };
}

export interface ProjectWithChats extends Project {
  chats: { id: string; title: string; model: string; updatedAt: string }[];
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" };
}

async function handle(res: Response) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export async function listProjects(): Promise<Project[]> {
  const res = await fetch(`${API_URL}/api/projects`, { headers: authHeaders() });
  const data = await handle(res);
  return data.projects;
}

export async function getProject(id: string): Promise<ProjectWithChats> {
  const res = await fetch(`${API_URL}/api/projects/${id}`, { headers: authHeaders() });
  const data = await handle(res);
  return data.project;
}

export async function createProject(name: string): Promise<Project> {
  const res = await fetch(`${API_URL}/api/projects`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name }),
  });
  const data = await handle(res);
  return data.project;
}

export async function renameProject(id: string, name: string): Promise<Project> {
  const res = await fetch(`${API_URL}/api/projects/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ name }),
  });
  const data = await handle(res);
  return data.project;
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/projects/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete project");
}
