// Auth client — passphrase 로그인. OAuth는 7단계에서.

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
