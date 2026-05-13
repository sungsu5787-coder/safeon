const Proposal = {
  _file: null,
  _dbName: 'safeon-proposal-db',
  _storeName: 'pendingProposals',

  init() {
    const photoInput = document.getElementById('proposal-photo');
    const form = document.getElementById('proposal-form');
    const photoBox = document.getElementById('proposal-photo-box');

    if (photoInput) photoInput.addEventListener('change', (event) => this.handlePhotoChange(event));
    if (form) form.addEventListener('submit', (event) => this.handleSubmit(event));
    if (photoBox) photoBox.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.openPhotoPicker();
      }
    });

    this.initOfflineQueue();
  },

  openPhotoPicker() {
    const photoInput = document.getElementById('proposal-photo');
    if (photoInput) photoInput.click();
  },

  handlePhotoChange(event) {
    const files = event.target.files;
    const preview = document.getElementById('proposal-photo-preview');
    const box = document.getElementById('proposal-photo-box');
    this._file = null;

    if (!files || !files.length) {
      if (preview) preview.innerHTML = '';
      return;
    }

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      this.showResult('이미지 파일을 선택해 주세요.', false);
      return;
    }

    this._file = file;
    const reader = new FileReader();
    reader.onload = () => {
      if (preview) {
        preview.innerHTML = `<img src="${reader.result}" alt="첨부 사진 미리보기">`;
      }
      if (box) box.querySelector('span').textContent = '사진이 선택되었습니다.';
    };
    reader.readAsDataURL(file);
  },

  async handleSubmit(event) {
    event.preventDefault();
    this.showResult('', true, true);

    const affiliation = document.getElementById('proposal-affiliation').value.trim();
    const department  = document.getElementById('proposal-department').value.trim();
    const name        = document.getElementById('proposal-name').value.trim();
    const phone       = document.getElementById('proposal-phone').value.trim();
    const suggestion  = document.getElementById('proposal-suggestion').value.trim();

    if (!affiliation || !department || !name || !phone || !suggestion) {
      return this.showResult('모든 항목을 빠짐없이 입력해 주세요.', false);
    }
    if (!this._file) {
      return this.showResult('위험 상황을 증빙할 사진을 반드시 첨부해야 합니다.', false);
    }

    const rawData = await this.readFileAsDataUrl(this._file);
    const imageData = await this.compressImage(rawData);
    const payload = { affiliation, department, name, phone, suggestion, imageData };

    if (!navigator.onLine) {
      await this.savePendingProposal(payload);
      this.showResult('⚠️ 현재 오프라인 상태입니다. 제안이 로컬에 저장되었으며 온라인 복구 시 자동 전송됩니다.', true);
      this.resetForm();
      this.updatePendingStatus();
      return;
    }

    try {
      const apiBase = window.API_BASE_URL || '';
      const response = await fetch(`${apiBase}/api/submit-proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '제안 제출 중 오류가 발생했습니다.');
      }

      this.showResult('✅ 제안 접수가 완료되었습니다. 관리자에게 알림톡이 전송되었습니다.', true);
      this.resetForm();
      this.updatePendingStatus();
    } catch (error) {
      console.error(error);
      await this.savePendingProposal(payload);
      this.showResult('⚠️ 네트워크에 문제가 있습니다. 제안이 로컬에 저장되었으며 온라인 복구 시 자동 전송됩니다.', true);
      this.resetForm();
      this.updatePendingStatus();
    }
  },

  async initOfflineQueue() {
    window.addEventListener('online', () => this.syncPendingProposals());
    this.updatePendingStatus();
    if (navigator.onLine) {
      setTimeout(() => this.syncPendingProposals(), 500);
    }
  },

  _openDb() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        return reject(new Error('IndexedDB is not supported'));
      }
      const request = indexedDB.open(this._dbName, 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this._storeName)) {
          db.createObjectStore(this._storeName, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async _withStore(mode, callback) {
    const db = await this._openDb();
    const tx = db.transaction(this._storeName, mode);
    const store = tx.objectStore(this._storeName);
    const result = await callback(store);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  },

  async savePendingProposal(payload) {
    const entry = {
      id: 'proposal_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      createdAt: new Date().toISOString(),
      payload
    };
    try {
      await this._withStore('readwrite', (store) => {
        store.put(entry);
      });
    } catch (error) {
      console.warn('[Proposal] pending save failed', error);
    }
  },

  async getPendingProposals() {
    try {
      return await this._withStore('readonly', (store) => {
        return new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        });
      });
    } catch (error) {
      console.warn('[Proposal] pending load failed', error);
      return [];
    }
  },

  async deletePendingProposal(id) {
    try {
      await this._withStore('readwrite', (store) => {
        store.delete(id);
      });
    } catch (error) {
      console.warn('[Proposal] pending delete failed', error);
    }
  },

  async countPendingProposals() {
    try {
      const list = await this.getPendingProposals();
      return list.length;
    } catch (_) {
      return 0;
    }
  },

  async syncPendingProposals() {
    if (!navigator.onLine) return;
    const pending = await this.getPendingProposals();
    if (!pending.length) return;

    for (const item of pending) {
      try {
        const apiBase = window.API_BASE_URL || '';
        const response = await fetch(`${apiBase}/api/submit-proposal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload)
        });
        if (!response.ok) throw new Error('Sync failed');
        await this.deletePendingProposal(item.id);
        this.showResult('✅ 오프라인으로 저장된 제안이 온라인 복구 시 자동 전송되었습니다.', true);
      } catch (err) {
        console.warn('[Proposal] sync failed', err);
        break;
      }
    }
    this.updatePendingStatus();
  },

  async updatePendingStatus() {
    const statusEl = document.getElementById('proposal-offline-status');
    if (!statusEl) return;
    const count = await this.countPendingProposals();
    if (count > 0) {
      statusEl.textContent = navigator.onLine
        ? `✅ 오프라인 저장 대기 ${count}건이 있습니다. 온라인 복구 시 자동 전송됩니다.`
        : `⚠️ 오프라인 저장 대기 ${count}건. 서버 복구 후 자동 전송됩니다.`;
      statusEl.classList.remove('hidden');
      statusEl.classList.toggle('offline', !navigator.onLine);
    } else if (!navigator.onLine) {
      statusEl.textContent = '⚠️ 현재 오프라인 상태입니다. 제출하면 제안이 로컬에 저장됩니다.';
      statusEl.classList.remove('hidden');
      statusEl.classList.add('offline');
    } else {
      statusEl.classList.add('hidden');
    }
  },

  compressImage(dataUrl, maxWidth = 1280, quality = 0.75) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round(height * maxWidth / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  },

  readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  showResult(message, success = true, pending = false) {
    const resultEl = document.getElementById('proposal-result');
    if (!resultEl) return;
    resultEl.className = 'proposal-result';
    if (pending) {
      resultEl.textContent = '제출 중입니다...';
      resultEl.classList.add('success');
      resultEl.classList.remove('error');
      resultEl.classList.remove('hidden');
      return;
    }
    resultEl.classList.add(success ? 'success' : 'error');
    resultEl.classList.remove(success ? 'error' : 'success');
    resultEl.textContent = message;
    resultEl.classList.remove('hidden');
  },

  resetForm() {
    document.getElementById('proposal-form').reset();
    this._file = null;
    const preview = document.getElementById('proposal-photo-preview');
    const box = document.getElementById('proposal-photo-box');
    if (preview) preview.innerHTML = '';
    if (box) {
      const label = box.querySelector('span');
      if (label) label.textContent = '최소 1장 이상 선택';
    }
  }
};

document.addEventListener('DOMContentLoaded', () => Proposal.init());
