// ===== Safety Checklist Module =====
const Checklist = {
  templates: {
    daily: {
      name: '일일 안전점검',
      categories: {
        '작업환경': [
          '작업장 정리정돈 상태',
          '통로 확보 및 장애물 제거',
          '조명 상태 적정 여부',
          '환기 상태 적정 여부',
          '위험구역 표시 및 안전표지판'
        ],
        '보호구': [
          '안전모 착용 상태',
          '안전화 착용 상태',
          '안전대(벨트) 착용 상태',
          '보안경/보호장갑 착용',
          '기타 개인보호구 상태'
        ],
        '장비/설비': [
          '사용 장비 점검 여부',
          '전기 배선 상태',
          '소화기 비치 및 상태',
          '안전난간 설치 상태',
          '가설구조물 안전 상태'
        ]
      }
    },
    weekly: {
      name: '주간 안전점검',
      categories: {
        '시설물 점검': [
          '건물 구조물 균열/변형',
          '비상구 확보 상태',
          '피난경로 표시 상태',
          '방화문 작동 상태',
          '옥상 출입구 관리'
        ],
        '전기/기계': [
          '분전반 관리 상태',
          '접지 상태 확인',
          '기계 방호장치 작동',
          '안전장치 정상 작동',
          '위험기계 자체검사 이행'
        ],
        '화학물질': [
          'MSDS 비치 상태',
          '화학물질 보관 상태',
          '취급 근로자 보호구',
          '누출 방지 조치',
          '경고표지 부착 상태'
        ],
        '관리적 사항': [
          '안전교육 실시 여부',
          '작업허가서 발행 여부',
          '비상연락망 게시',
          '안전보건 게시물 관리',
          '위험성평가 실시 여부'
        ]
      }
    },
    special: {
      name: '특별 안전점검',
      categories: {
        '고소작업': [
          '작업발판 설치 상태',
          '안전난간 설치',
          '안전대 부착설비',
          '승강설비 확보',
          '추락방지망 설치'
        ],
        '밀폐공간': [
          '산소농도 측정',
          '유해가스 측정',
          '환기설비 가동',
          '감시인 배치',
          '비상구조장비 비치'
        ],
        '화기작업': [
          '화기작업 허가서 확인',
          '소화기 비치',
          '인화물질 격리',
          '화재감시인 배치',
          '불꽃비산 방지 조치'
        ]
      }
    },
    equipment: {
      name: '장비 점검',
      categories: {
        '중장비': [
          '작동 상태 이상 유무',
          '유압장치 누유 확인',
          '경보장치 작동 확인',
          '후방카메라/경보기',
          '아웃리거 상태 확인'
        ],
        '전동공구': [
          '전원코드 손상 여부',
          '누전차단기 작동',
          '방호덮개 설치',
          '스위치 작동 상태',
          '접지 상태 확인'
        ],
        '양중기': [
          '와이어로프 상태',
          '후크 해지장치',
          '과부하 방지장치',
          '권과 방지장치',
          '신호수 배치 확인'
        ]
      }
    },

    fire: {
      name: '소방안전점검',
      categories: {
        '소화설비': [
          '소화기 설치위치 적정 여부 (보행거리 20m 이내)',
          '소화기 압력계 정상 범위(녹색) 여부',
          '소화기 안전핀·봉인 상태 이상 없음',
          '소화기 부식·변형·손상 여부',
          '옥내소화전 호스·관창 결합 상태',
          '옥내소화전 밸브 개폐 작동 정상',
          '스프링클러 헤드 변형·손상·장애물 없음',
          '스프링클러 제어밸브 잠금 해제 상태'
        ],
        '경보설비': [
          '자동화재탐지설비 수신기 정상 표시',
          '감지기(연기·열) 먼지 부착·손상 여부',
          '발신기 위치 표시등 점등 확인',
          '발신기 유리 파괴·버튼 이상 없음',
          '비상방송설비 앰프·스피커 작동 여부',
          '시각경보기(청각장애인용) 작동 상태'
        ],
        '피난·방화설비': [
          '비상구 표시등 점등 및 시인성 확보',
          '비상구 잠금 장치 없음 (상시 개방 또는 내부 개방 가능)',
          '피난통로·비상계단 장애물 없음',
          '방화문 자동폐쇄장치 정상 작동',
          '방화셔터 하부 적재물 없음',
          '유도등(피난구·통로) 점등 상태',
          '피난유도선 설치 상태 이상 없음'
        ],
        '소방시설 관리': [
          '소방시설 위에 물건 적재 금지 이행',
          '소방 관련 표지판 부착 상태',
          '소화펌프실 출입문 개방 가능 여부',
          '소방시설 자체점검 기록부 비치',
          '화재대피훈련 계획서 게시 여부',
          '비상연락망(119·관계자) 게시 상태'
        ],
        '위험물·화기 관리': [
          '화기취급 작업 허가서 발행 여부',
          '인화성·가연성 물질 지정 장소 보관',
          '위험물 용기 밀폐·표지 부착 상태',
          '소각 행위 금지 이행',
          '용접·절단 작업 시 불꽃비산 방지포 설치',
          '전기 배선·콘센트 과부하 사용 여부'
        ]
      }
    }
  },

  results: {},

  _CATEGORY_EMOJI: {
    '작업환경':       '🏗️',
    '보호구':         '🦺',
    '장비/설비':      '⚙️',
    '시설물 점검':    '🏢',
    '전기/기계':      '⚡',
    '화학물질':       '☣️',
    '관리적 사항':    '📋',
    '고소작업':       '⬆️',
    '밀폐공간':       '🚪',
    '화기작업':       '🔥',
    '중장비':         '🚧',
    '전동공구':       '🔧',
    '양중기':         '🏗️',
    '소화설비':       '🧯',
    '경보설비':       '🔔',
    '피난·방화설비':  '🏃',
    '소방시설 관리':  '📊',
    '위험물·화기 관리': '⚠️'
  },

  init() {
    this.form = document.getElementById('checklist-form');
    this.container = document.getElementById('checklist-items');

    // Type change -> load template
    document.getElementById('check-type').addEventListener('change', (e) => {
      this.loadTemplate(e.target.value);
    });

    // Form submit
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.save();
    });
  },

  loadTemplate(type) {
    this.results = {};
    this.container.innerHTML = '';

    const template = this.templates[type];
    if (!template) return;

    Object.entries(template.categories).forEach(([category, items]) => {
      const catDiv = document.createElement('div');
      catDiv.className = 'checklist-category';

      const catEmoji = this._CATEGORY_EMOJI[category] || '📌';
      let html = `<h4>${catEmoji} ${App.escapeHtml(category)}</h4>`;
      items.forEach((item, idx) => {
        const key = `${category}-${idx}`;
        html += `
          <div class="check-item">
            <label>${App.escapeHtml(item)}</label>
            <div class="check-status">
              <button type="button" onclick="Checklist.setStatus('${key}', 'pass', this)">양호</button>
              <button type="button" onclick="Checklist.setStatus('${key}', 'fail', this)">불량</button>
              <button type="button" onclick="Checklist.setStatus('${key}', 'na', this)">해당없음</button>
            </div>
          </div>
        `;
      });

      catDiv.innerHTML = html;
      this.container.appendChild(catDiv);
    });
  },

  setStatus(key, status, btnEl) {
    this.results[key] = status;

    // Update button styles
    const parent = btnEl.parentElement;
    parent.querySelectorAll('button').forEach(btn => {
      btn.className = '';
    });

    const classMap = { pass: 'active-pass', fail: 'active-fail', na: 'active-na' };
    btnEl.className = classMap[status];
  },

  async save() {
    const type = document.getElementById('check-type').value;
    if (!type) { App.showToast('점검유형을 선택하세요'); return; }

    const typeNames = { daily: '일일 안전점검', weekly: '주간 안전점검', special: '특별 안전점검', equipment: '장비 점검', fire: '소방안전점검' };

    // Build readable results
    const template = this.templates[type];
    const readableResults = {};
    let failCount = 0;
    Object.entries(template.categories).forEach(([category, items]) => {
      items.forEach((item, idx) => {
        const key = `${category}-${idx}`;
        const val = this.results[key] || 'unchecked';
        readableResults[item] = val;
        if (val === 'fail') failCount++;
      });
    });

    const date      = document.getElementById('check-date').value;
    const location  = document.getElementById('check-location').value.trim();
    const failTxt   = failCount ? `<br>❌ 불량 항목 <b>${failCount}건</b> 포함` : '';
    const ok = await App.confirm(
      `<b>${typeNames[type]}</b><br>${date} · ${location || '장소 미입력'}${failTxt}`,
      { type: 'save', title: '안전점검을 저장하시겠습니까?', icon: '✅' }
    );
    if (!ok) return;

    const data = {
      date,
      type:      typeNames[type] || type,
      typeCode:  type,
      location,
      results:   readableResults,
      opinion:   document.getElementById('check-opinion').value.trim(),
      inspector: document.getElementById('check-inspector').value.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      await collections.checklist.add(data);
      App.showToast('✅ 점검 결과가 저장되었습니다');
      this.resetForm();
      App.updateDashboard();
    } catch (err) {
      App.showToast('저장 오류: ' + err.message);
      console.error(err);
    }
  },

  resetForm() {
    this.form.reset();
    this.container.innerHTML = '';
    this.results = {};
    document.getElementById('check-date').value = new Date().toISOString().split('T')[0];
  }
};
