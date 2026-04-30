const Proposal = {
  _file: null,

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

    try {
      const imageData = await this.readFileAsDataUrl(this._file);
      const response = await fetch('/api/submit-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ affiliation, department, name, phone, suggestion, imageData })
      });

      const data = await response.json();
      if (!response.ok) {
        return this.showResult(data.error || '제안 제출 중 오류가 발생했습니다.', false);
      }

      this.showResult('✅ 제안 접수가 완료되었습니다. 관리자에게 알림톡이 전송되었습니다.', true);
      this.resetForm();
    } catch (error) {
      console.error(error);
      this.showResult('네트워크 오류가 발생했습니다. 다시 시도해 주세요.', false);
    }
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
