// Auth client — Google OAuth (primary) + passphrase (fallback).

export async function checkAuth(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/me');
    return res.ok;
  } catch {
    return false;
  }
}

export async function login(passphrase: string): Promise<void> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passphrase })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `로그인 실패: ${res.status}`);
  }
}

export async function googleLogin(credential: string): Promise<{ email: string }> {
  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Google 로그인 실패: ${res.status}`);
  }
  return res.json();
}

// Public OAuth config from server (so the client knows whether OAuth is on
// and which client_id to use for GIS init).
export interface OAuthConfig {
  enabled: boolean;
  clientId?: string;
}

export async function getOAuthConfig(): Promise<OAuthConfig> {
  try {
    const res = await fetch('/api/auth/config');
    if (!res.ok) return { enabled: false };
    return res.json();
  } catch {
    return { enabled: false };
  }
}
