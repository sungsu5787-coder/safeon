// ================================================================
// Storage Layer — Server API 기반 (PC 서버 공유 저장소)
// 모든 데이터가 PC의 data/*.json 에 저장됩니다.
// → 핸드폰에서 입력한 데이터를 PC에서 바로 확인 가능
// ================================================================

const API_BASE = '/api';

// ── 쿼리 체인 빌더 ─────────────────────────────────────────────
function _buildQuery(collection, initFilters) {
  const q = {
    _coll:    collection,
    _field:   'createdAt',
    _dir:     'desc',
    _limit:   1000,
    _filters: initFilters ? initFilters.slice() : []
  };

  q.limit   = function(n)        { this._limit = n; return this; };
  q.orderBy = function(f, d)     { this._field = f; this._dir = (d || 'asc'); return this; };
  q.where   = function(f, op, v) { this._filters.push({ field: f, op: op, value: v }); return this; };

  q.get = async function() {
    const params = new URLSearchParams();
    params.set('orderBy', this._field);
    params.set('dir',     this._dir);
    params.set('limit',   this._limit);
    this._filters.forEach(function(f) {
      params.append('f', f.field + ':' + f.op + ':' + f.value);
    });
    try {
      const res = await fetch(API_BASE + '/' + this._coll + '?' + params.toString(), { cache: 'no-store' });
      if (!res.ok) return _emptySnap();
      const arr = await res.json();
      return {
        size: arr.length,
        forEach: function(cb) { arr.forEach(function(r) { cb({ id: r.id, data: function() { return r; }, exists: true }); }); }
      };
    } catch(e) {
      console.error('[API] query 실패:', e);
      return _emptySnap();
    }
  };

  return q;
}

function _emptySnap() {
  return { size: 0, forEach: function() {} };
}

// ── 컬렉션 팩토리 ───────────────────────────────────────────────
function apiCollection(name) {
  return {

    // add(data) → Promise<{id}>
    add: async function(data) {
      const res = await fetch(API_BASE + '/' + name, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data)
      });
      if (!res.ok) throw new Error('API add 실패: ' + res.status);
      return await res.json();   // { id: '...' }
    },

    // doc(id) → { get, update, delete }
    doc: function(id) {
      return {
        get: async function() {
          try {
            const res = await fetch(API_BASE + '/' + name + '/' + id, { cache: 'no-store' });
            if (!res.ok) return { exists: false, id: id, data: function() { return {}; } };
            const d = await res.json();
            return { exists: true, id: id, data: function() { return d; } };
          } catch(e) {
            return { exists: false, id: id, data: function() { return {}; } };
          }
        },
        update: async function(fields) {
          const res = await fetch(API_BASE + '/' + name + '/' + id, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(fields)
          });
          if (!res.ok) throw new Error('API update 실패: ' + res.status);
        },
        delete: async function() {
          await fetch(API_BASE + '/' + name + '/' + id, { method: 'DELETE' });
        }
      };
    },

    // orderBy(field, dir).where(...).limit(n).get()
    orderBy: function(field, dir) {
      return _buildQuery(name, []).orderBy(field, dir);
    },

    // where(field, op, value) → chainable query
    where: function(field, op, value) {
      return _buildQuery(name, [{ field: field, op: op, value: value }]);
    }
  };
}

// ── 전역 collections 초기화 ────────────────────────────────────
var collections = {
  tbm:       apiCollection('tbm'),
  risk:      apiCollection('risk'),
  checklist: apiCollection('checklist'),
  workplan:  apiCollection('workplan'),
  ptw:       apiCollection('ptw'),
  accident:  apiCollection('accident')
};

console.log('[Storage] Server API 모드 초기화 완료 — 데이터가 PC 서버에 저장됩니다');

// ── localStorage → 서버 마이그레이션 (기존 데이터 1회 자동 이전) ──
(async function migrateLocalStorage() {
  const COLLS = ['tbm', 'risk', 'checklist', 'workplan', 'ptw', 'accident'];
  const MIG_KEY = 'safeon_api_migrated_v1';

  if (localStorage.getItem(MIG_KEY) === '1') return;  // 이미 완료

  // 서버 연결 확인
  try {
    const ping = await fetch(API_BASE + '/tbm?limit=1', { cache: 'no-store' });
    if (!ping.ok) return;
  } catch(e) { return; }

  let total = 0;
  for (const name of COLLS) {
    const raw = localStorage.getItem('safety_' + name);
    if (!raw) continue;
    let items;
    try { items = JSON.parse(raw); } catch(e) { continue; }
    if (!Array.isArray(items) || items.length === 0) continue;

    // 서버에 이미 데이터 있으면 스킵 (덮어쓰기 방지)
    try {
      const chk = await fetch(API_BASE + '/' + name + '?limit=1', { cache: 'no-store' });
      const existing = await chk.json();
      if (Array.isArray(existing) && existing.length > 0) continue;
    } catch(e) { continue; }

    // 서버에 업로드
    for (const item of items) {
      try {
        await fetch(API_BASE + '/' + name, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(item)
        });
        total++;
      } catch(e) {}
    }
    localStorage.removeItem('safety_' + name);
  }

  localStorage.setItem(MIG_KEY, '1');
  if (total > 0) {
    console.log('[Migration] localStorage → 서버 이전 완료: ' + total + '건');
  }
})();
