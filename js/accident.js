// ===== Accident Module (안전사고발생보고서) =====
const Accident = {
  photos: [],
  reporterSig: null,

  TYPE_LABELS: {
    nearmiss:   '아차사고',
    safety:     '안전사고',
    industrial: '산업재해',
    serious:    '중대재해'
  },

  init() {
    this.form = document.getElementById('accident-form');
    if (!this.form) return;
    this.form.addEventListener('submit', e => { e.preventDefault(); this.save(); });

    // 사진 input 변경
    const photoInput = document.getElementById('accident-photo-input');
    if (photoInput) photoInput.addEventListener('change', e => this.handlePhotos(e));

    // 업로드 영역 클릭 → input 트리거
    const uploadArea = document.getElementById('accident-upload-area');
    if (uploadArea) uploadArea.addEventListener('click', () => photoInput && photoInput.click());
  },

  onPageShow() {
    if (!this.reporterSig) {
      this.reporterSig = new SignatureCanvas(
        document.getElementById('accident-sig-canvas'),
        document.getElementById('accident-sig-clear')
      );
    }
    this.reporterSig.resize();
  },

  // ── 사고유형 선택 ──────────────────────────────────────────
  selectType(btn) {
    document.querySelectorAll('.accident-type-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    // 아차사고: 부상자 정보 숨김
    const sec = document.getElementById('accident-injured-section');
    if (sec) sec.style.display = btn.dataset.type === 'nearmiss' ? 'none' : 'block';
  },

  getSelectedType() {
    const sel = document.querySelector('.accident-type-btn.selected');
    return sel ? sel.dataset.type : '';
  },

  // ── 사진 처리 ──────────────────────────────────────────────
  async handlePhotos(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    let added = 0;
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        App.showToast(`${file.name}: 이미지 파일만 가능합니다`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        App.showToast(`${file.name}: 10MB 이하만 첨부 가능합니다`);
        continue;
      }
      if (this.photos.length >= 10) {
        App.showToast('사진은 최대 10장까지 첨부 가능합니다');
        break;
      }
      try {
        const raw = await this._fileToDataURL(file);
        const compressed = await this._compressImage(raw, 1200, 0.78);
        this.photos.push({ name: file.name, data: compressed });
        added++;
      } catch {
        App.showToast(`${file.name} 처리에 실패했습니다`);
      }
    }

    e.target.value = '';
    if (added) {
      this.renderPhotoPreview();
      App.showToast(`📷 사진 ${added}장 추가 (총 ${this.photos.length}장)`);
    }
  },

  _fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = ev => resolve(ev.target.result);
      r.onerror = () => reject(new Error('읽기 실패'));
      r.readAsDataURL(file);
    });
  },

  _compressImage(dataUrl, maxSize, quality) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width >= height) { height = Math.round(height * maxSize / width); width = maxSize; }
          else                 { width = Math.round(width * maxSize / height);  height = maxSize; }
        }
        const c = document.createElement('canvas');
        c.width = width; c.height = height;
        c.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  },

  renderPhotoPreview() {
    const container = document.getElementById('accident-photo-preview');
    if (!container) return;
    if (!this.photos.length) { container.innerHTML = ''; return; }
    container.innerHTML = this.photos.map((p, i) => `
      <div class="photo-thumb">
        <img src="${p.data}" alt="${App.escapeHtml(p.name)}"
             onclick="Accident.viewPhoto(${i})">
        <button type="button" class="photo-remove"
                onclick="event.stopPropagation();Accident.removePhoto(${i})"
                title="삭제">×</button>
      </div>
    `).join('');
  },

  removePhoto(idx) {
    this.photos.splice(idx, 1);
    this.renderPhotoPreview();
    App.showToast('사진이 삭제되었습니다');
  },

  viewPhoto(idx) {
    const p = this.photos[idx];
    if (p) App._viewPhoto(p.data);
  },

  // ── 저장 ───────────────────────────────────────────────────
  async save() {
    const type = this.getSelectedType();
    if (!type) { App.showToast('⚠️ 사고유형을 선택하세요'); return; }

    const date = document.getElementById('accident-date').value;
    if (!date) { App.showToast('⚠️ 발생일자를 입력하세요'); return; }

    const location = document.getElementById('accident-location').value.trim();
    if (!location) { App.showToast('⚠️ 발생장소를 입력하세요'); return; }

    const content = document.getElementById('accident-content').value.trim();
    if (!content) { App.showToast('⚠️ 사고경위를 입력하세요'); return; }

    const isInjury   = type !== 'nearmiss';
    const photoTxt   = this.photos.length ? `<br>📷 사진 ${this.photos.length}장 포함` : '';
    const injuredName = isInjury ? document.getElementById('accident-injured-name').value.trim() : '';
    const injuredTxt  = injuredName ? `<br>부상자: <b>${injuredName}</b>` : '';

    const ok = await App.confirm(
      `<b>${this.TYPE_LABELS[type]}</b><br>${date} · ${location}${injuredTxt}${photoTxt}`,
      { type: 'delete', title: '사고보고서를 저장하시겠습니까?', icon: '🚨' }
    );
    if (!ok) return;

    const data = {
      date,
      time:              document.getElementById('accident-time').value,
      accidentType:      type,
      accidentTypeLabel: this.TYPE_LABELS[type] || type,
      location,
      reporter:          document.getElementById('accident-reporter').value.trim(),
      department:        document.getElementById('accident-dept').value.trim(),
      content,
      cause:             document.getElementById('accident-cause').value.trim(),
      injuredName:       isInjury ? injuredName : '',
      injuredInfo:       isInjury ? document.getElementById('accident-injured-info').value.trim() : '',
      injuredPart:       isInjury ? document.getElementById('accident-injured-part').value.trim() : '',
      injuredLevel:      isInjury ? document.getElementById('accident-injured-level').value.trim() : '',
      immediateAction:   document.getElementById('accident-immediate').value.trim(),
      preventionPlan:    document.getElementById('accident-prevention').value.trim(),
      photos:            this.photos.map(p => p.data),
      reporterSignature: this.reporterSig ? this.reporterSig.toDataURL() : '',
      status:            'submitted',
      createdAt:         new Date().toISOString()
    };

    try {
      await collections.accident.add(data);
      App.showToast(`✅ ${this.TYPE_LABELS[type]} 보고서 저장 완료`);
      this.resetForm();
      App.updateDashboard();
    } catch (err) {
      App.showToast('저장 오류: ' + err.message);
      console.error(err);
    }
  },

  // ══════════════════════════════════════════════════════════
  //  AI 재발방지대책 추천 (KOSHA 4단계 위험성 감소대책 체계)
  //  출처: 사업장 위험성평가에 관한 지침 (고용노동부 고시 제2024-76호)
  //        KOSHA GUIDE 각 분야별 기술지침
  // ══════════════════════════════════════════════════════════

  // ── KOSHA 기반 사고유형별 지식DB ────────────────────────
  PREVENTION_DB: [
    {
      id: 'fall_height',
      name: '추락·떨어짐',
      keywords: ['추락','떨어','고소','비계','사다리','지붕','개구부','고공','계단','난간','발판','작업발판','높이'],
      tiers: {
        '① 본질적 대책': [
          '고소작업을 지상작업으로 대체 (작업방법 변경)',
          '이동식 작업대 → 고정식 작업발판으로 교체',
          '작업공정 재설계로 고소작업 최소화'
        ],
        '② 공학적 대책': [
          '안전난간 설치 (높이 90cm 이상, 중간대·발끝막이판 포함)',
          '안전망(추락방호망) 설치 [KOSHA GUIDE C-4]',
          '개구부 덮개 설치 및 고정장치 부착',
          '고정식 작업발판 폭 40cm 이상 확보',
          '사다리 상단 고정장치 및 미끄럼 방지 발판 설치'
        ],
        '③ 행정적 대책': [
          '고소작업 작업허가서(PTW) 의무 발행',
          '작업 전 TBM 실시 — 추락 위험요인 공유',
          '고소작업 안전교육 및 특별안전교육 실시',
          '2인 1조 작업 원칙 수립 및 준수',
          '악천후(강풍·강우) 시 작업 중지 기준 수립'
        ],
        '④ 보호구 착용': [
          '안전대(풀 바디 하네스) 착용 및 체결 의무화',
          '안전모 착용 (턱끈 체결)',
          '안전화 착용',
          '안전대 부착설비(D링·생명줄) 점검 후 사용'
        ]
      },
      source: 'KOSHA GUIDE C-4, 산업안전보건기준에관한규칙 §42~§50'
    },
    {
      id: 'slip_trip',
      name: '넘어짐·미끄러짐',
      keywords: ['넘어','미끄러','걸려','바닥','통로','경사','물기','기름','비젖은','젖은','정리정돈'],
      tiers: {
        '① 본질적 대책': [
          '작업장 바닥 재질 교체 (미끄럼 방지 소재 적용)',
          '경사로·계단 구배 완화 (작업장 구조 개선)'
        ],
        '② 공학적 대책': [
          '미끄럼 방지 테이프·패드 부착',
          '배수시설 설치로 바닥 물기 제거',
          '통로 조명 밝기 300럭스 이상 확보',
          '경사면 논슬립 처리 및 핸드레일 설치',
          '배관·호스 등 걸림 요인 통로 밖으로 이설'
        ],
        '③ 행정적 대책': [
          '작업구역 5S 활동 정례화 (정리·정돈·청소·청결·습관화)',
          '우천·결빙 시 통로 즉시 모래 살포 또는 제설 절차 수립',
          '바닥 위험구역 황색 경고선 표시 및 안전표지판 설치',
          '작업 후 바닥 청소 책임자 지정 및 점검표 운용'
        ],
        '④ 보호구 착용': [
          '미끄럼 방지 안전화 착용 의무화',
          '작업복 발목 이하 구속 (말려 걸림 방지)'
        ]
      },
      source: 'KOSHA GUIDE G-3, 산업안전보건기준에관한규칙 §21~§26'
    },
    {
      id: 'entrapment',
      name: '끼임·협착',
      keywords: ['끼임','협착','말림','끼어','회전체','벨트','기어','컨베이어','롤러','프레스','절단','물림','잡혀'],
      tiers: {
        '① 본질적 대책': [
          '설비 위험 부위 구조 개선 (끼임 발생 가능 간격 제거)',
          '자동화·원격조작 시스템 도입으로 접촉 위험 제거',
          '위험 공정 외주화 또는 전용 로봇으로 대체'
        ],
        '② 공학적 대책': [
          '회전부·동력전달부에 방호덮개 설치 의무화',
          '인터록(Interlock) 장치 설치 — 덮개 개방 시 자동 정지',
          '양수조작식·광전자식 방호장치 설치 (프레스류)',
          '비상정지 버튼 작업자 손이 닿는 위치에 설치',
          'LOTO(잠금·표지) 장치 표준화 및 비치'
        ],
        '③ 행정적 대책': [
          'LOTO(잠금·태그아웃) 절차서 수립 및 교육 실시',
          '설비 점검·청소 중 반드시 전원 차단 절차 문서화',
          '작업허가서(PTW) — 설비 정비작업 대상 포함',
          '설비 가동 중 청소·조정 금지 규정 수립',
          '신규 근로자 대상 끼임 사고 특별교육 실시'
        ],
        '④ 보호구 착용': [
          '헐렁한 옷·끈·장갑 등 말림 우려 물품 착용 금지',
          '방진마스크·보안경 착용 (절삭 이물질 비산 방지)',
          '내절 장갑 착용 (날카로운 부위 접촉 시)'
        ]
      },
      source: 'KOSHA GUIDE M-10, 산업안전보건기준에관한규칙 §87~§103'
    },
    {
      id: 'collision',
      name: '충돌·부딪힘·맞음',
      keywords: ['충돌','부딪','맞음','낙하물','비래','물체','떨어진','날아','차량','지게차','크레인','인양','중장비','운반'],
      tiers: {
        '① 본질적 대책': [
          '보행자·차량 동선 분리 (별도 통로 확보)',
          '낙하위험 구역 하부 작업 금지 (구조적 분리)',
          '인양·운반 작업 자동화 도입으로 수작업 최소화'
        ],
        '② 공학적 대책': [
          '작업구역 접근 차단 펜스·로프·표지판 설치',
          '두부 낙하물 방호선반(방호막) 설치',
          '차량 후진 경보장치·후방카메라 부착 의무화',
          '밀폐형 하역장 또는 방호형 컨테이너 사용',
          '건물 외부 낙하물 방지망 설치'
        ],
        '③ 행정적 대책': [
          '인양작업 반경 내 출입금지 구역 설정 및 감시자 배치',
          '차량·장비 이동 경로 신호수(유도자) 배치',
          '공구·자재 낙하 방지 밧줄 결속 규정 수립',
          '작업 전 지게차·크레인 점검표 운용',
          '야간 작업 시 조명 충분히 확보 (150럭스 이상)'
        ],
        '④ 보호구 착용': [
          '안전모 착용 (턱끈 체결) 의무화',
          '안전조끼(형광) 착용 — 차량 운행 구역',
          '안전화 착용',
          '보안경 착용 (비산물 위험 작업 시)'
        ]
      },
      source: 'KOSHA GUIDE C-17, 산업안전보건기준에관한규칙 §14~§20'
    },
    {
      id: 'fire_explosion',
      name: '화재·폭발',
      keywords: ['화재','화염','폭발','용접','불꽃','인화','유증기','인화성','가연성','누출','스파크','점화','연기','소화기','화기'],
      tiers: {
        '① 본질적 대책': [
          '인화성 물질을 불연성·난연성 물질로 대체',
          '용접·화기작업 구역을 가연물 없는 전용 장소로 이전',
          '발화 위험 설비를 자동화로 교체하여 작업자 접촉 제거'
        ],
        '② 공학적 대책': [
          '화기작업 반경 11m 내 가연물 제거 또는 불연성 덮개 설치',
          '폭발방지 구조(방폭형) 전기설비 사용',
          '스프링클러·자동소화설비 설치 및 유지보수',
          '가스누출 감지기 설치 및 경보 연동',
          '환기시설 설치로 가연성 증기·가스 농도 관리'
        ],
        '③ 행정적 대책': [
          '화기작업 허가서(PTW) 발행 의무화',
          '화기작업 전 가스농도 측정 및 기록',
          '소화기 비치 위치·사용법 교육 정례화',
          '화기감시자 지정 및 작업 종료 후 30분 잔류 점검',
          '가연성 물질 보관·취급 절차서 수립'
        ],
        '④ 보호구 착용': [
          '방염복 착용 (용접·화기작업 시)',
          '차광 용접면·보안경 착용',
          '방열장갑 착용',
          '방진마스크 또는 송기마스크 착용'
        ]
      },
      source: 'KOSHA GUIDE P-81, 산업안전보건기준에관한규칙 §225~§251'
    },
    {
      id: 'electrical',
      name: '감전',
      keywords: ['감전','전기','전선','누전','충전부','배전반','전기설비','접지','전압','아크','합선','단락','전류'],
      tiers: {
        '① 본질적 대책': [
          '저전압 기기로 교체 (작업 환경 전압 저감)',
          '충전부 노출 배선 → 절연 배선으로 전면 교체',
          '전기작업 자동화·원격화로 접촉 위험 제거'
        ],
        '② 공학적 대책': [
          '충전부 절연 덮개·방호 울타리 설치',
          '누전차단기 설치 및 월 1회 이상 작동 점검',
          '접지(어스) 공사 실시 및 접지 저항값 관리 (10Ω 이하)',
          '배전반·분전반 잠금장치 설치',
          '방수·방진형 전기설비 사용 (습기·분진 환경)'
        ],
        '③ 행정적 대책': [
          '전기작업 유자격자(전기기능사 이상) 지정 및 관리',
          'LOTO 절차 적용 — 전기설비 정비 시 전원 차단 확인',
          '전기설비 정기점검 주기 수립 및 기록',
          '비전문가 전기작업 금지 규정 게시',
          '전기 안전교육 연 1회 이상 실시'
        ],
        '④ 보호구 착용': [
          '절연장갑(내전압용) 착용',
          '절연화 착용',
          '절연안전모 착용',
          '전기 아크 방호복 착용 (고압 작업 시)'
        ]
      },
      source: 'KOSHA GUIDE E-2, 산업안전보건기준에관한규칙 §301~§325'
    },
    {
      id: 'chemical',
      name: '화학물질·유해물질',
      keywords: ['화학','약품','유해','독성','가스','증기','분진','세척','용제','유기','도금','산','알카리','MSDS','GHS','중독','흡입','피부','부식'],
      tiers: {
        '① 본질적 대책': [
          '유해·독성 물질을 독성이 낮은 대체물질로 교체 (MSDS 비교 후)',
          '밀폐 공정 도입으로 작업자 노출 경로 차단',
          '습식공법 전환으로 분진 발생 억제'
        ],
        '② 공학적 대책': [
          '국소배기장치 설치 및 풍량·포착속도 정기 측정',
          '밀폐형 용기·이송 설비 사용 (개방 취급 금지)',
          '비상세척설비(긴급샤워·세안기) 30m 이내 설치',
          '가스·증기 농도 실시간 모니터링 시스템 구축',
          '화학물질 보관창고 환기·방폭 설비 설치'
        ],
        '③ 행정적 대책': [
          'MSDS(물질안전보건자료) 작업장 비치 및 교육 의무화',
          '화학물질 취급 절차서(SOP) 수립 및 게시',
          '작업 전 위험성평가 실시 및 기록',
          '화학물질 정기 건강검진 실시',
          '누출 사고 대응 비상대응 절차 수립 및 훈련'
        ],
        '④ 보호구 착용': [
          '방독마스크(용도별 정화통 선택) 착용',
          '화학물질용 내화학 장갑 착용',
          '보안경 또는 고글 착용',
          '불침투성 보호복 착용',
          '안전화(내화학성) 착용'
        ]
      },
      source: 'KOSHA GUIDE H-1, 산업안전보건기준에관한규칙 §420~§450'
    },
    {
      id: 'heavy_lifting',
      name: '중량물·근골격계',
      keywords: ['중량물','무거운','들기','허리','요통','근골격','반복작업','인력운반','무게','중량','적재','운반','하역'],
      tiers: {
        '① 본질적 대책': [
          '중량물 무게를 25kg 이하로 분할 포장·납품 요청',
          '인력 운반 작업을 기계화·자동화로 대체 (지게차·컨베이어)',
          '작업장 레이아웃 개선으로 운반 거리 최소화'
        ],
        '② 공학적 대책': [
          '호이스트·체인블록 등 보조 운반 기구 비치',
          '전동 리프트·핸드트럭 도입',
          '작업대 높이 조절 기능 추가 (허리 굴곡 최소화)',
          '진동 감소 장갑·방진 공구 사용'
        ],
        '③ 행정적 대책': [
          '근골격계 부담작업 유해요인 조사 연 1회 실시',
          '2인 1조 중량물 취급 작업 원칙 수립',
          '올바른 중량물 취급 방법 교육 및 포스터 부착',
          '작업 전·후 스트레칭 체조 프로그램 운영',
          '중량물 취급 중량 기준 및 표지판 부착'
        ],
        '④ 보호구 착용': [
          '요추 보호대(허리 벨트) 착용',
          '안전화 착용 (낙하 충격 방지)',
          '방진장갑 착용 (진동 공구 사용 시)'
        ]
      },
      source: 'KOSHA GUIDE H-9, 산업안전보건기준에관한규칙 §657~§667'
    },
    {
      id: 'cut_laceration',
      name: '베임·찔림·절단',
      keywords: ['베임','찔림','절단','칼','커터','날카','톱','그라인더','드릴','날','금속','파편','쇳조각','유리'],
      tiers: {
        '① 본질적 대책': [
          '날카로운 수공구를 자동 공구로 대체',
          '가공 공정 자동화로 작업자 날 부위 접촉 차단'
        ],
        '② 공학적 대책': [
          '회전공구(그라인더·톱) 날 접촉 방호덮개 설치',
          '칼날 이동 방향 반대쪽에 손이 없도록 작업대 구조 개선',
          '날카로운 모서리·버(Burr) 제거 및 라운딩 처리',
          '작업물 고정 지그·바이스 사용 의무화'
        ],
        '③ 행정적 대책': [
          '날카로운 공구 사용 전 점검 및 결함 공구 즉시 폐기',
          '올바른 공구 사용법·방향 교육',
          '작업 시작 전 주변 정리 및 안전거리 확보 습관화',
          '절단·베임 사고 이력 분석 및 대책 공유 (TBM 활용)'
        ],
        '④ 보호구 착용': [
          '내절 안전장갑(ANSI A4 등급 이상) 착용',
          '보안경 착용 (파편 비산)',
          '안전화 착용',
          '팔 토시(슬리브) 착용'
        ]
      },
      source: 'KOSHA GUIDE M-14, 산업안전보건기준에관한규칙 §87~§103'
    },
    {
      id: 'burn_heat',
      name: '화상·열',
      keywords: ['화상','뜨거운','고열','열','스팀','증기','용융','주조','열처리','용접불꽃','끓는','고온'],
      tiers: {
        '① 본질적 대책': [
          '고온 작업공정 자동화·원격 조작으로 작업자 접촉 차단',
          '고온 물질 온도 저감 또는 저온 공정으로 대체'
        ],
        '② 공학적 대책': [
          '고온 배관·설비 열 차단 단열재 도포 (접촉 방지)',
          '고온 물질 비산 방지 덮개·방호막 설치',
          '작업공간 냉각 설비(에어컨·선풍기) 설치',
          '경보 온도계·열화상 카메라로 이상 온도 모니터링'
        ],
        '③ 행정적 대책': [
          '고온 작업 전 위험성 평가 실시',
          '고온 설비 주변 접근금지 표지판 설치',
          '폭염 시 추가 휴식·음수 시간 부여 (KOSHA 폭염 가이드)',
          '화상 응급처치 절차 수립 및 구급함 비치'
        ],
        '④ 보호구 착용': [
          '방열복·방열 앞치마 착용',
          '방열장갑 착용',
          '안면 보호구(차광면) 착용',
          '안전화(내열) 착용'
        ]
      },
      source: 'KOSHA GUIDE H-20, 산업안전보건기준에관한규칙 §559~§571'
    },
    {
      id: 'confined_space',
      name: '밀폐공간·산소결핍',
      keywords: ['밀폐','맨홀','탱크','피트','터널','갱내','지하','산소결핍','질식','유해가스','황화수소','일산화탄소','이산화탄소'],
      tiers: {
        '① 본질적 대책': [
          '밀폐공간 내부 작업을 외부에서 원격으로 대체',
          '밀폐공간 위험 설비의 외부 접근 가능 구조로 재설계'
        ],
        '② 공학적 대책': [
          '작업 전·중 산소(18% 이상)·유해가스 농도 연속 측정',
          '강제 환기 장치(급기·배기 팬) 설치 및 작동',
          '감시인 상주 및 비상구조 장비(사다리·인양기) 비치',
          '음성·영상 통신 장비 내부 작업자에게 지급'
        ],
        '③ 행정적 대책': [
          '밀폐공간 작업허가서(PTW) 발행 의무화',
          '밀폐공간 작업 감시자 지정 및 연락체계 수립',
          '비상대피 절차·신호 약속 사전 교육',
          '밀폐공간 작업 전 특별안전교육 실시'
        ],
        '④ 보호구 착용': [
          '공기호흡기(SCBA) 또는 전동팬 송기마스크 착용',
          '구명줄(Lifeline) 착용',
          '방독마스크 (경미한 오염 공간)',
          '안전모·안전화 착용'
        ]
      },
      source: 'KOSHA GUIDE H-80, 산업안전보건기준에관한규칙 §618~§636'
    },
    {
      id: 'general',
      name: '일반 안전관리',
      keywords: [],  // 기본값 (키워드 미매칭 시 적용)
      tiers: {
        '① 본질적 대책': [
          '위험 작업공정 재설계 또는 위험 요소 제거',
          '위험한 재료·물질을 안전한 것으로 대체'
        ],
        '② 공학적 대책': [
          '방호장치·안전장치 설치 및 정기 점검',
          '경보장치·비상정지 장치 설치',
          '작업환경 개선 (조명·환기·통로 확보)'
        ],
        '③ 행정적 대책': [
          '작업 전 TBM 실시 — 당일 위험요인 공유',
          '작업절차서(SOP) 수립·게시 및 정기 교육',
          '위험성평가 결과 반영 및 후속 조치 확인',
          '사고 사례 공유 및 재발 방지 교육'
        ],
        '④ 보호구 착용': [
          '작업별 적합한 보호구 선정 및 지급',
          '보호구 착용 의무화 및 점검',
          '보호구 정기 교체 주기 관리'
        ]
      },
      source: '사업장 위험성평가에 관한 지침 (고용노동부 고시 제2024-76호)'
    }
  ],

  // ── 텍스트에서 사고 카테고리 감지 ──────────────────────
  _detectCategories(text) {
    const t = text.toLowerCase();
    const matched = this.PREVENTION_DB
      .filter(db => db.id !== 'general')
      .filter(db => db.keywords.some(kw => t.includes(kw)));
    // 매칭 없으면 일반 카테고리 사용
    return matched.length ? matched : [this.PREVENTION_DB.find(d => d.id === 'general')];
  },

  // ── AI 추천 버튼 클릭 ──────────────────────────────────
  suggestPrevention() {
    const content = (document.getElementById('accident-content').value || '').trim();
    const cause   = (document.getElementById('accident-cause').value   || '').trim();
    const type    = this.getSelectedType();
    const fullText = `${content} ${cause} ${type}`;
    const categories = this._detectCategories(fullText);

    const container = document.getElementById('prevention-categories');
    if (!container) return;

    const tierOrder = ['① 본질적 대책','② 공학적 대책','③ 행정적 대책','④ 보호구 착용'];
    const tierClass = { '① 본질적 대책':'prev-tier-1','② 공학적 대책':'prev-tier-2','③ 행정적 대책':'prev-tier-3','④ 보호구 착용':'prev-tier-4' };
    const tierIcon  = { '① 본질적 대책':'🔴','② 공학적 대책':'🟠','③ 행정적 대책':'🟢','④ 보호구 착용':'🔵' };
    const tierDesc  = { '① 본질적 대책':'제거·대체 (최우선)','② 공학적 대책':'설비·환경 개선','③ 행정적 대책':'절차·교육·관리','④ 보호구 착용':'마지막 수단' };

    // 티어별로 모든 카테고리 항목 합산
    const tierMap = {};
    tierOrder.forEach(t => { tierMap[t] = []; });

    categories.forEach(cat => {
      tierOrder.forEach(tier => {
        const items = cat.tiers[tier] || [];
        items.forEach(item => {
          if (!tierMap[tier].includes(item)) tierMap[tier].push(item);
        });
      });
    });

    let html = '';
    if (categories[0]?.id !== 'general') {
      html += `<div style="font-size:11px;color:var(--primary);font-weight:700;padding:4px 2px 8px">
        🎯 감지된 사고유형: ${categories.map(c=>`<strong>${c.name}</strong>`).join(', ')}
      </div>`;
    }

    tierOrder.forEach((tier, idx) => {
      const items = tierMap[tier];
      if (!items.length) return;
      html += `<div class="prev-tier ${tierClass[tier]}">
        <div class="prev-tier-header">
          ${tierIcon[tier]} ${tier}
          <span class="prev-tier-badge">${tierDesc[tier]}</span>
        </div>
        <div class="prev-items">`;
      items.forEach((item, i) => {
        const cbId = `prev_${idx}_${i}`;
        html += `<label class="prev-item" for="${cbId}">
          <input type="checkbox" id="${cbId}" value="${App.escapeHtml(item)}"
                 onchange="this.closest('.prev-item').classList.toggle('checked', this.checked)">
          <span class="prev-item-text">${App.escapeHtml(item)}</span>
        </label>`;
      });
      html += `</div>`;
      if (categories[0]) {
        html += `<div class="prev-source">출처: ${categories[0].source}</div>`;
      }
      html += `</div>`;
    });

    container.innerHTML = html;
    document.getElementById('prevention-modal').classList.remove('hidden');
  },

  _toggleItem(label) {
    const cb = label.querySelector('input[type="checkbox"]');
    label.classList.toggle('checked', cb.checked);
  },

  // ── 선택 항목 textarea에 적용 ──────────────────────────
  applyPrevention() {
    const checked = document.querySelectorAll('#prevention-categories input[type="checkbox"]:checked');
    if (!checked.length) { App.showToast('항목을 하나 이상 선택하세요'); return; }

    const tierOrder = ['① 본질적 대책','② 공학적 대책','③ 행정적 대책','④ 보호구 착용'];
    // 티어별로 분류
    const byTier = {};
    tierOrder.forEach(t => { byTier[t] = []; });

    checked.forEach(cb => {
      const label = cb.closest('.prev-item');
      const tierHeader = label.closest('.prev-tier').querySelector('.prev-tier-header');
      const tierName = tierOrder.find(t => tierHeader.textContent.includes(t)) || '';
      if (tierName) byTier[tierName].push(cb.value);
    });

    const lines = [];
    tierOrder.forEach(tier => {
      if (byTier[tier].length) {
        lines.push(`[${tier}]`);
        byTier[tier].forEach(item => lines.push(`• ${item}`));
      }
    });

    const existing = document.getElementById('accident-prevention').value.trim();
    document.getElementById('accident-prevention').value =
      existing ? existing + '\n\n' + lines.join('\n') : lines.join('\n');

    this.closePreventionModal();
    App.showToast(`✓ ${checked.length}개 대책 적용 완료`);
  },

  // ── 모달 닫기 ──────────────────────────────────────────
  closePreventionModal(event) {
    // 오버레이 배경 탭/클릭 시만 닫기 (Android touch 포함)
    if (event) {
      const overlay = document.getElementById('prevention-modal');
      if (event.target !== overlay) return;
    }
    document.getElementById('prevention-modal').classList.add('hidden');
  },

  // ── 폼 초기화 ──────────────────────────────────────────────
  resetForm() {
    this.form.reset();
    this.photos = [];
    const prev = document.getElementById('accident-photo-preview');
    if (prev) prev.innerHTML = '';
    document.querySelectorAll('.accident-type-btn.selected').forEach(b => b.classList.remove('selected'));
    const sec = document.getElementById('accident-injured-section');
    if (sec) sec.style.display = 'block';
    if (this.reporterSig) this.reporterSig.clear();
    document.getElementById('accident-date').value = new Date().toISOString().split('T')[0];
  }
};
