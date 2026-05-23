// Data backup/restore — aim IndexedDB (progress) ↔ utajlpt D1.
//
// 백업: 로컬 IndexedDB의 progress + settings를 JSON으로 export.
// 복원: JSON 업로드 → /api/migrate POST.
// 외부에서 받은 데이터(예: lyric D1 dump)도 같은 /api/migrate로 받음.

import { db } from './db';

export interface BackupPayload {
  schemaVersion: 1;
  generatedAt: string;
  progress: Array<{
    vocabId: string;
    mastered: boolean;
    lastSeen: number;
    reviewCount: number;
    knownCount: number;
    unknownCount: number;
    addedAt: number;
  }>;
}

export async function exportLocalBackup(): Promise<BackupPayload> {
  const rows = await db.progress.toArray();
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    progress: rows.map(r => ({
      vocabId: r.id,
      mastered: r.mastered === 1,
      lastSeen: r.lastSeen,
      reviewCount: r.reviewCount,
      knownCount: r.knownCount,
      unknownCount: r.unknownCount,
      addedAt: r.addedAt
    }))
  };
}

export function downloadBackup(payload: BackupPayload, filename = `utajlpt-backup-${Date.now()}.json`) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importLocalBackup(payload: BackupPayload): Promise<number> {
  if (payload.schemaVersion !== 1) throw new Error('지원하지 않는 백업 버전이야.');
  const rows = payload.progress.map(p => ({
    id: p.vocabId,
    mastered: (p.mastered ? 1 : 0) as 0 | 1,
    lastSeen: p.lastSeen ?? 0,
    reviewCount: p.reviewCount ?? 0,
    knownCount: p.knownCount ?? 0,
    unknownCount: p.unknownCount ?? 0,
    addedAt: p.addedAt ?? 0
  }));
  await db.progress.bulkPut(rows);
  return rows.length;
}

// 서버 측 migrate 엔드포인트로 일괄 전송 (D1에 적재)
export async function pushToServer(payload: BackupPayload): Promise<{ progress: number }> {
  const res = await fetch('/api/migrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ progress: payload.progress })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `서버 동기화 실패: ${res.status}`);
  }
  return res.json();
}

export async function syncFullToServer(): Promise<{ progress: number }> {
  const payload = await exportLocalBackup();
  return pushToServer(payload);
}
