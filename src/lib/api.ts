const API_BASE = "/api";

export const api = {
  getStats: () => fetch(`${API_BASE}/stats`).then(res => res.json()),
  getProjects: () => fetch(`${API_BASE}/projects`).then(res => res.json()),
  getInventory: (projectId?: string) => {
    const url = projectId ? `${API_BASE}/inventory?projectId=${projectId}` : `${API_BASE}/inventory`;
    return fetch(url).then(res => res.json());
  },
  getRequests: () => fetch(`${API_BASE}/requests`).then(res => res.json()),
  createRequest: (data: any) => fetch(`${API_BASE}/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  updateRequestStatus: (id: number, status: string) => fetch(`${API_BASE}/requests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  }).then(res => res.json()),
  getEmployees: () => fetch(`${API_BASE}/employees`).then(res => res.json()),
  createEmployee: (data: any) => fetch(`${API_BASE}/employees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  createProject: (data: any) => fetch(`${API_BASE}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(res => res.json()),
};
