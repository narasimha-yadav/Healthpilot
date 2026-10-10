const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const identity = sessionStorage.getItem('healthpilot-user');
  if (identity) headers.set('X-User-Identity', identity);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      detail = body.detail || detail;
    } catch {
      // Keep the HTTP error useful when the server did not return JSON.
    }
    throw new Error(detail);
  }
  return response.json();
}

export function askHealthPilot(message, language, person = 'me') {
  return request('/api/healthpilot/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, language, person }),
  });
}

export function analyzeReport(file, language = 'en') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('language', language);
  return request('/api/healthpilot/reports/analyze', {
    method: 'POST',
    body: formData,
  });
}

export function getFamilyMembers() {
  const identity = encodeURIComponent(sessionStorage.getItem('healthpilot-user') || '');
  return request(`/api/healthpilot/family-members?identity=${identity}`);
}

export function addFamilyMember(member) {
  const identity = encodeURIComponent(sessionStorage.getItem('healthpilot-user') || '');
  return request(`/api/healthpilot/family-members?identity=${identity}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(member),
  });
}

export function registerAccount(fullName, email, password, phone) {
  return request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name: fullName, email, password, phone }),
  });
}

export function requestAccountVerification(identity) {
  return request('/api/auth/verification/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity }),
  });
}

export function confirmAccountVerification(identity, code) {
  return request('/api/auth/verification/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity, code }),
  });
}

export function loginAccount(identity, password) {
  return request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity, password }),
  });
}

export function requestPasswordReset(identity) {
  return request('/api/auth/password-reset/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity }),
  });
}

export function confirmPasswordReset(identity, code, password) {
  return request('/api/auth/password-reset/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity, code, password }),
  });
}

export function getMedicineStatuses() {
  const identity = encodeURIComponent(sessionStorage.getItem('healthpilot-user') || '');
  return request(`/api/healthpilot/medicines?identity=${identity}`);
}

export function saveMedicineStatus(medicineId, status) {
  const identity = encodeURIComponent(sessionStorage.getItem('healthpilot-user') || '');
  return request(`/api/healthpilot/medicines/status?identity=${identity}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ medicine_id: medicineId, status }),
  });
}

export function resetMedicineStatuses() {
  const identity = encodeURIComponent(sessionStorage.getItem('healthpilot-user') || '');
  return request(`/api/healthpilot/medicines/status?identity=${identity}`, { method: 'DELETE' });
}

export function getReports() {
  const identity = encodeURIComponent(sessionStorage.getItem('healthpilot-user') || '');
  return request(`/api/healthpilot/reports?identity=${identity}`);
}

export function saveReport(report) {
  const identity = encodeURIComponent(sessionStorage.getItem('healthpilot-user') || '');
  return request(`/api/healthpilot/reports?identity=${identity}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
  });
}

export function getChatHistory() {
  const identity = encodeURIComponent(sessionStorage.getItem('healthpilot-user') || '');
  return request(`/api/healthpilot/chat/history?identity=${identity}`);
}
