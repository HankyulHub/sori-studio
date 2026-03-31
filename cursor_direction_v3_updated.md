# cursor_direction_v3_updated.md
# 소리마을 v3 — 홈 대시보드 최종 리디자인 지시서

---

## 🎯 핵심 변경 요약

홈 대시보드를 **"메시지 자동화 앱"** 아이덴티티에 맞게 전면 재설계한다.
앱을 열었을 때 0.5초 안에 "이건 메시지 만드는 앱이다"가 전달되어야 한다.

### 대시보드 구조 (위→아래 순서)

| 순서 | 섹션 | 핵심 역할 |
|------|------|-----------|
| 1 | **메시지 센터** | 앱 아이덴티티. CTA 카드 2개 (레슨 피드백 쓰기 + 안내문 쓰기) |
| 2 | **확인이 필요한 항목** | 미납 안내 + 생일 알림 등 액션 필요한 것들 |
| 3 | **이번 달 현황** | 매출 + 명세서 발송 현황 (간단한 그래프 포함) |

### 삭제 항목 (대시보드에서 제거)
- ~~오늘의 레슨 일정~~ → 학생 탭에서 확인
- ~~AI 피드백 대기 카드~~ → 메시지 탭에서 확인
- ~~학원 운영 현황 (42명/12명/수용률)~~ → 더보기 탭으로 이동
- ~~피아노 이미지 + 명언 카드~~ → 완전 삭제
- ~~"PREMIUM ACADEMY MANAGEMENT" 칩~~ → 완전 삭제
- ~~Recent Messages 리스트~~ → 완전 삭제

### 하단 탭 구조 (5개)

| 탭 | 아이콘 | 라벨 |
|----|--------|------|
| 홈 | `home` | 홈 |
| 학생 | `group` | 학생 |
| 메시지 | `mail` | 메시지 |
| 명세서 | `receipt_long` | 명세서 |
| 더보기 | `more_horiz` | 더보기 |

> **중요:** 메시지 탭은 기존에 있던 AI 피드백 생성 + 히스토리 기능을 그대로 유지한다.
> 대시보드의 "레슨 피드백 쓰기" / "안내문 쓰기" 버튼은 메시지 탭의 해당 플로우로 네비게이션하는 숏컷이다.

---

## 📐 섹션별 상세 스펙

### 섹션 1: 메시지 센터

대시보드 최상단. 웰컴 메시지 바로 아래.

#### 웰컴 메시지
```
반갑습니다, 원장님.
오늘도 예술적인 하루가 되길 바랍니다.
```
- 첫 줄: `font-family: Manrope`, `font-size: 2rem (32px)`, `font-weight: 700`, `color: #002046`
- 둘째 줄: `font-size: 0.875rem (14px)`, `color: #44474e`

#### CTA 카드 2개 (나란히 배치)

**카드 1: 레슨 피드백 쓰기** (Primary — 강조)
- 배경: `piano-gradient` (linear-gradient 45deg, #002046 → #1b365d)
- 텍스트 색: white
- 아이콘: `edit_note` (Material Symbols, FILL 1, 골드 #dec482)
- 타이틀: "레슨 피드백 쓰기" (20px, bold, white)
- 설명: "학생의 성장을 기록하고 학부모님과 공유하세요." (14px, #87a0cd)
- 하단 CTA: "바로 작성하기 →" (골드 #dec482, bold)
- hover: translateY(-4px) + shadow 증가
- 클릭: 메시지 탭 → 레슨 피드백 생성 플로우로 이동

**카드 2: 안내문 쓰기** (Secondary — 보조)
- 배경: #ffffff (surface-container-lowest)
- 테두리: 1px solid rgba(196, 198, 207, 0.1) — outline-variant at 10%
- 아이콘: `campaign` (Material Symbols, FILL 1, #002046)
- 타이틀: "안내문 쓰기" (20px, bold, #002046)
- 설명: "수업료 안내, 일정 변경, 휴원 공지를 자동 생성합니다." (14px, #44474e)
- 하단 CTA: "새 공지 작성 +" (#002046, bold)
- hover: shadow-md 추가
- 클릭: 메시지 탭 → 안내문 생성 플로우로 이동

**모바일:** 2개 카드 세로 스택 (1열)
**태블릿/데스크톱:** 2개 카드 나란히 (2열 grid)

```
┌──────────────────────┐  ┌──────────────────────┐
│ 🎹 (네이비 그라데이션) │  │ 📢 (화이트 카드)       │
│                      │  │                      │
│ 레슨 피드백 쓰기      │  │ 안내문 쓰기            │
│ 학생의 성장을 기록하고 │  │ 수업료 안내, 일정 변경, │
│ 학부모님과 공유하세요. │  │ 휴원 공지를 자동 생성.  │
│                      │  │                      │
│ 바로 작성하기 →       │  │ 새 공지 작성 +         │
└──────────────────────┘  └──────────────────────┘
```

#### 안내문 AI 생성 기능 (신규)
안내문 쓰기도 AI가 초안을 생성하는 플로우로 구현한다:
- 원장이 "수업료 안내" / "일정 변경" / "휴원 공지" / "기타" 중 유형 선택
- AI가 템플릿 기반으로 초안 생성
- 원장이 검토 → 수정 → 클립보드 복사 → 카톡에서 직접 발송
- (레슨 피드백과 동일한 "검토 후 복사" 플로우)

---

### 섹션 2: 확인이 필요한 항목

섹션 헤더: "확인이 필요한 항목"

#### 표시 로직
- 표시할 항목이 없으면 이 섹션 자체를 숨긴다 (빈 상태 표시 X)
- 항목은 우선순위 순: 미납 > 생일 > 기타

#### 미납 안내 카드
- 좌측: 빨간 계열 아이콘 (error 컬러 #ba1a1a)
  - 아이콘 배경: `error-container` (#ffdad6) 원형
  - 아이콘: `warning` (Material Symbols)
- border-left: 4px solid error 컬러 (50% opacity)
- 타이틀: "미납 안내 (N건)" (bold, #002046)
- 설명: "김지유 학생 외 N명 수업료 결제일이 지났습니다."
- **버튼 2개:**
  - `[보기]` — 상세 내용 펼치기 (secondary 스타일)
  - `[독촉 안내문 쓰기]` — **미납 학부모 대상 부드러운 안내 메시지 AI 생성**
    - Primary 스타일 (네이비 배경, 흰 글씨)
    - 아이콘: `edit_note`
    - 클릭 시: 해당 미납 학생/학부모 정보가 pre-fill된 상태로 안내문 생성 플로우 진입
    - AI가 "둥글게" 쓴 독촉 메시지 초안 생성 → 원장 검토 → 복사

> **핵심 UX:** 미납 항목이 있을 때만 "독촉 안내문 쓰기" 버튼이 활성화된다.
> 미납이 0건이면 이 카드 자체가 안 보인다.

#### 생일 축하 카드
- 좌측: 골드 계열 아이콘
  - 아이콘 배경: `secondary-container` (#fed488) 원형
  - 아이콘: `cake` (Material Symbols)
- border-left: 4px solid secondary 컬러 (#775a19, 50% opacity)
- 타이틀: "생일 축하 (N건)" (bold, #002046)
- 설명: "오늘은 김민준 학생의 생일입니다. 축하 메시지를 보내보세요."
- **버튼 2개:**
  - `[보기]` — 상세 보기
  - `[축하 메시지 복사]` — AI가 생성한 생일 축하 메시지 클립보드 복사
    - 아이콘: `content_copy`

#### 기타 확장 가능 항목 (향후)
- 레슨 취소/변경 알림
- 신규 학생 등록 알림
- 대기자 전환 알림

---

### 섹션 3: 이번 달 현황

가장 하단. 간결하게.

#### 레이아웃: 2열 그리드 (모바일: 1열 스택)

**카드 1: 명세서 발송 현황**
- 배경: `piano-gradient` (네이비 그라데이션)
- 텍스트: white
- 라벨: "명세서 발송 현황" (10px, uppercase, tracking-widest, 60% opacity)
- 숫자: "45" (4xl, Manrope bold) + "/ 50건 발송 완료" (sm, 60% opacity)
- 미발송 표시: "미발송 5건" (작은 펄스 도트 + 텍스트)

**카드 2: 누적 수업료**
- 배경: white (surface-container-lowest)
- 테두리: outline-variant 15% opacity
- 라벨: "누적 수업료" (10px, uppercase, primary 40% opacity)
- 숫자: "₩12,450,000" (3xl, Manrope bold, primary)
- 부가정보: "전월 동기 대비 +12%" (10px, secondary bold)
- **간단한 바 그래프 (최근 3개월):**
  - 가로 바 3개 (8월, 9월, 10월)
  - 이번 달은 `piano-gradient` 컬러, 이전 달들은 `surface-container-high`
  - 높이 제한: 전체 80px 이내
  - 각 바 옆에 월 라벨 + 금액 (옵션)

```
8월  ████████████░░░░░░░  ₩10.2M
9월  ██████████████░░░░░  ₩11.1M
10월 █████████████████░░  ₩12.4M (진행중)
```

> **"이번 달"은 현재 진행 중이므로:**
> - 명세서 기준 누적 수업료를 표시한다 (발송 완료 건 합계)
> - "진행 중" 또는 "N일 기준" 라벨을 붙인다
> - 전월 데이터는 확정된 숫자

---

## 🎨 디자인 톤 & 스타일 규칙

### 폰트 — Manrope 단일 (최우선 수정)

**이 작업을 가장 먼저 수행한다.**

1. Google Fonts import에서 Noto Serif **완전 삭제**
```html
<!-- 삭제 -->
<link href="...Noto+Serif..." rel="stylesheet"/>

<!-- 유지 (Manrope만) -->
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
```

2. CSS에 강제 선언 추가
```css
body {
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif !important;
}
```

3. Tailwind config `fontFamily` 수정
```javascript
fontFamily: {
  "headline": ["Manrope", "sans-serif"],
  "body": ["Manrope", "sans-serif"],
  "label": ["Manrope", "sans-serif"]
}
```

4. 코드 전체에서 grep하여 제거:
```bash
grep -rn "Noto Serif" --include="*.{js,jsx,ts,tsx,css,html,vue}"
grep -rn "font-serif" --include="*.{js,jsx,ts,tsx,css,html,vue}"
grep -rn "font-headline" --include="*.{js,jsx,ts,tsx,css,html,vue}"
# font-headline 클래스 사용하는 곳은 font-body 또는 직접 Manrope 지정으로 교체
```

5. 개발자 도구에서 확인:
- body에 Computed Style → font-family가 "Manrope"인지 확인
- h1, h2, h3, p, span 등 모든 요소에서 확인

### 컬러 팔레트 (DESIGN.md 기준 유지)

| 역할 | 값 | 용도 |
|------|-----|------|
| primary | `#002046` | 메인 텍스트, CTA 배경 |
| primary-container | `#1b365d` | 그라데이션 끝점 |
| secondary (골드) | `#775a19` | 강조 포인트 (절제해서 사용) |
| surface | `#faf9f6` | 기본 배경 (아이보리) |
| surface-container-low | `#f4f3f1` | 섹션 배경 |
| surface-container-lowest | `#ffffff` | 카드 배경 |
| on-surface | `#1a1c1a` | 본문 텍스트 (순수 블랙 금지) |
| error | `#ba1a1a` | 미납 등 경고 |

### 스타일 규칙 (DESIGN.md 준수)

- **No-Line Rule:** 1px solid 보더로 섹션 구분 금지. 배경색 차이로 구분.
- **No Pure Black:** 텍스트에 #000000 금지. 항상 `on-surface` (#1a1c1a) 사용.
- **No Sharp Corners:** 모든 요소에 최소 0.25rem border-radius.
- **Piano Gradient:** 주요 CTA 버튼에 45deg linear-gradient(#002046 → #1b365d).
- **Glass Nav:** 하단 네비에 `backdrop-filter: blur(20px)` + 80% opacity 배경.
- **골드는 절제:** secondary(#775a19)는 생일 카드 아이콘, 피드백 카드 CTA 텍스트 등 하이라이트에만.
- **여백:** 섹션 간 간격 2.5rem(40px). 카드 내부 패딩 1.25rem~2rem.
- **Ambient Shadow:** 플로팅 요소는 `rgba(26, 28, 26, 0.04)` + 32px blur + 8px Y-offset.

---

## ⚠️ 홈 탭 활성 표시 버그 수정

하단 네비에서 "홈" 아이콘에 갈색 동그라미가 겹쳐 보이는 문제.

### 현재 문제 코드 (기존 v3에서)
```css
/* 활성 탭의 ::after pseudo-element가 아이콘 위에 겹침 */
.active-tab::after {
  content: '';
  position: absolute;
  /* ... 위치가 아이콘과 겹침 */
}
```

### 수정 방향
- 활성 탭 indicator를 아이콘 아래 텍스트 아래에 위치
- 또는 아이콘 FILL 1 + 텍스트 bold로 활성 상태 표현 (dot 삭제)

### 권장 구현 (dot 삭제, 아이콘 fill로 구분)
```html
<!-- 활성 탭 -->
<a class="flex flex-col items-center text-primary font-bold">
  <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">home</span>
  <span class="text-[10px] uppercase mt-1">홈</span>
</a>

<!-- 비활성 탭 -->
<a class="flex flex-col items-center text-[#74777f]">
  <span class="material-symbols-outlined">group</span>
  <span class="text-[10px] uppercase mt-1">학생</span>
</a>
```

---

## 🔄 작업 순서

1. **폰트 수정** (Manrope 단일화) — 가장 먼저. 완료 후 개발자 도구에서 확인.
2. **하단 탭 구조 변경** — 홈/학생/메시지/명세서/더보기 5개로. 활성 표시 버그 수정.
3. **대시보드 섹션 1: 메시지 센터** — CTA 카드 2개 구현. 메시지 탭 플로우 연결.
4. **대시보드 섹션 2: 확인이 필요한 항목** — 미납 카드(독촉 안내문 쓰기 버튼 포함) + 생일 카드.
5. **대시보드 섹션 3: 이번 달 현황** — 명세서 발송 + 매출 + 간단 바 그래프.
6. **기존 요소 제거** — 오늘의 레슨, AI 피드백 카드, 운영현황, 피아노 이미지, 명언 제거.
7. **QA** — 모바일/태블릿 반응형, 폰트, 컬러, 여백 점검.

---

## 📋 체크리스트

### 폰트
- [ ] Noto Serif import 삭제됨
- [ ] Manrope만 import됨 (wght 300~800)
- [ ] body에 `font-family: 'Manrope', sans-serif` 선언됨
- [ ] Tailwind config headline/body/label 모두 Manrope
- [ ] 코드에 "Noto Serif", "font-serif" 참조 0건
- [ ] 개발자 도구에서 실제 렌더링 확인됨

### 대시보드 구조
- [ ] 섹션 순서: 메시지 센터 → 확인 필요 항목 → 이번 달 현황
- [ ] 메시지 센터: CTA 카드 2개 (피드백 + 안내문)
- [ ] 확인 필요 항목: 미납 카드 + 생일 카드
- [ ] 미납 카드에 "독촉 안내문 쓰기" 버튼 있음
- [ ] 이번 달 현황: 명세서 발송 + 매출 + 바 그래프
- [ ] 오늘의 레슨 일정 제거됨
- [ ] AI 피드백 카드 제거됨
- [ ] 운영현황 (42명/12명) 제거됨
- [ ] 피아노 이미지 + 명언 제거됨
- [ ] Recent Messages 제거됨

### 하단 탭
- [ ] 5개 탭: 홈/학생/메시지/명세서/더보기
- [ ] 메시지 탭이 기존 AI 피드백 생성 기능 유지
- [ ] 활성 탭 표시 버그 수정됨 (갈색 dot 겹침 없음)
- [ ] Glass 네비 바 (backdrop-blur + 80% opacity)

### 디자인 톤
- [ ] 배경: 아이보리(#faf9f6), 순백 금지
- [ ] 텍스트: on-surface(#1a1c1a), 순흑 금지
- [ ] 1px solid 보더 섹션 구분 없음 (No-Line Rule)
- [ ] 모든 요소 최소 0.25rem radius
- [ ] 골드(#775a19) 절제 사용
- [ ] 메인 CTA에 piano-gradient 적용됨

---

## 💡 기획 피드백 & 장단점 분석

### 장점
1. **앱 아이덴티티 확립:** 대시보드 열자마자 "메시지 앱"임을 인지. 경쟁사 대비 명확한 포지셔닝.
2. **액션 중심 UX:** 원장이 대시보드에서 바로 행동할 수 있음 (피드백 쓰기, 독촉문 쓰기, 복사).
3. **미납 → 독촉 안내문 연결:** 현실적 pain point를 바로 해결. "미납 확인 → 뭐라고 보내지? → AI가 써줌 → 복사 → 카톡" 원스톱.
4. **구조 단순화:** 3섹션으로 인지 부하 감소. 스크롤 1~2번이면 전부 보임.
5. **안내문 AI 생성:** 레슨 피드백뿐 아니라 공지/안내문도 AI가 도와주면 앱 활용도 대폭 상승.

### 단점 & 리스크
1. **오늘의 레슨 부재:** 일부 원장은 "오늘 누가 오지?"를 대시보드에서 보길 원할 수 있음.
   - **대응:** 학생 탭 상단에 "오늘의 레슨" 섹션 눈에 띄게 배치. 또는 향후 사용자 피드백 보고 대시보드 하단에 축소 버전 추가 검토.
2. **"확인이 필요한 항목"이 비어있을 때:** 미납 0건 + 생일 없으면 섹션이 통째로 사라짐 → 대시보드가 허전할 수 있음.
   - **대응:** 섹션 숨기되, 메시지 센터 CTA 카드가 충분히 크므로 시각적 공백 최소화. 또는 "오늘은 확인할 사항이 없습니다 ✓" 한 줄 표시 검토.
3. **안내문 AI 품질:** 독촉문은 톤이 매우 민감함. "부드럽게 쓴다"는 것의 기준이 사람마다 다름.
   - **대응:** AI 생성 후 반드시 원장 검토 단계 필수. 프롬프트에 "학부모 관계 유지"를 강조. 템플릿 3종 (매우 부드러움 / 표준 / 약간 단호) 제공도 고려.
4. **이번 달 현황 정확도:** 진행 중인 달의 매출은 변동됨.
   - **대응:** "N일 기준" 라벨 + 명세서 발송 완료분 기준 누적으로 명시.
5. **메시지 탭과 대시보드 중복:** 대시보드 CTA가 메시지 탭으로 이동시키는 구조라, "그냥 메시지 탭 바로 누르면 되잖아?"라는 의문.
   - **대응:** 대시보드 CTA는 "오늘 해야 할 일" 맥락 제공 + 원터치 진입이 핵심. 메시지 탭은 히스토리/검색/관리용. 역할 분리 명확.

### 향후 확장 제안
- **대시보드 개인화:** 원장이 섹션 순서/표시 여부 커스터마이즈
- **알림 뱃지:** 미납 건수를 하단 탭 "명세서" 아이콘 위에 빨간 뱃지로 표시
- **주간 리포트 카드:** 이번 달 현황 아래에 "이번 주 발송한 메시지 N건" 요약
- **퀵 액션 위젯:** 모바일 홈 화면 위젯으로 "피드백 쓰기" 바로가기

---

## 📎 참고 파일

- `DESIGN.md` — 디자인 시스템 원본 (컬러, 타이포, 컴포넌트 규칙)
- `code.html` — 스티치 디자인 초안 HTML (참고용, 이 지시서 기준으로 수정)
- `screen.png` — 스티치 초안 스크린샷

---

## ⚡ 커서에 바로 보낼 프롬프트 요약

```
아래 지시 사항을 순서대로 수행해줘:

1. 폰트 수정 (최우선):
   - Noto Serif 관련 import, config, 클래스 전부 삭제
   - Manrope 단일 폰트로 통일
   - body에 font-family: 'Manrope', sans-serif !important 선언
   - 개발자 도구에서 실제 적용 확인

2. 하단 탭 변경:
   - 5개 탭: 홈/학생/메시지/명세서/더보기
   - 아이콘: home, group, mail, receipt_long, more_horiz
   - 활성 탭: 아이콘 FILL 1 + primary 컬러 + bold 텍스트 (갈색 dot 삭제)
   - Glass 네비바: bg rgba(250,249,246,0.8) + backdrop-blur 20px

3. 홈 대시보드 재설계:
   섹션 1 — 메시지 센터:
   - CTA 카드 2개 나란히 (모바일: 세로 스택)
   - "레슨 피드백 쓰기" (piano-gradient 배경, 흰 텍스트, 골드 CTA)
   - "안내문 쓰기" (흰 배경, 네이비 텍스트)
   - 각각 메시지 탭의 해당 플로우로 네비게이션

   섹션 2 — 확인이 필요한 항목:
   - 미납 안내 카드 (빨간 아이콘, border-left error 컬러)
     - [보기] 버튼 + [독촉 안내문 쓰기] 버튼 (AI 생성 → 복사 플로우)
   - 생일 축하 카드 (골드 아이콘, border-left secondary 컬러)
     - [보기] 버튼 + [축하 메시지 복사] 버튼
   - 항목 없으면 섹션 숨김

   섹션 3 — 이번 달 현황:
   - 2열 그리드 (모바일: 1열)
   - 명세서 발송 현황 (네이비 카드, "45/50건 발송 완료")
   - 누적 수업료 (흰 카드, ₩12,450,000 + 간단 바 그래프 최근 3개월)

4. 삭제 항목:
   - 오늘의 레슨 일정 (학생 탭으로 이동)
   - AI 피드백 대기 카드
   - 학원 운영 현황 (42명/12명)
   - 피아노 이미지 + 명언
   - Recent Messages 리스트

5. 디자인 규칙 준수:
   - 배경 #faf9f6 (아이보리), 순백/순흑 금지
   - 1px solid 보더 섹션 구분 금지 (배경색 차이로)
   - 모든 요소 최소 0.25rem radius
   - 골드(#775a19) 절제 사용

참고 파일: DESIGN.md, cursor_direction_v3_updated.md
```
