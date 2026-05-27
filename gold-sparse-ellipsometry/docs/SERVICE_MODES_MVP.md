# Service Modes MVP Spec

## 1) 목적

서비스 운영 조건에서 다각도/편광 촬영이 어려운 환경을 고려해 측정 모드를 이원화한다.

- 정밀 모드: 기존 편광 + 다각도 기반 회귀 파이프라인 유지 (연구/오프라인 우선)
- 간편 모드: 일반 사진 기반 범위형 추정 제공 (서비스 기본)

## 2) 모드 정책

### 정밀 모드

- 입력: 최소 4 view, view당 편광 4채널 (`I0/I45/I90/I135`)
- 출력: 연속형 karat, gold_fraction, confidence, optical_features
- 사용처: 연구, 내부 검증, 고신뢰 측정 시나리오

### 간편 모드

- 입력: 일반 사진 1장 이상 (권장 2장: 정면 + 약간 기울임)
- 출력:
  - `karat_range`: `10-14K` | `14-18K` | `18-24K`
  - `probabilities`: 구간별 확률
  - `confidence`: `low|medium|high`
  - `needs_retake`: 재촬영 권고 여부
- 제약:
  - 확정값(단일 K 값) 미노출
  - 거래/가격 결정 사용 금지 문구 필수

## 3) 간편 모드 추론 로직 (MVP)

### 입력 특징

- 평균 명도(`mean_luma`)
- 평균 채도(`mean_saturation`)
- 하이라이트 비율(`highlight_ratio`)
- 암부 비율(`shadow_ratio`)
- 온색 비율(`warm_ratio`)
- 배경 복잡도(`background_complexity`)
- 금색 픽셀 비율(`gold_pixel_ratio`)
- 피사체 점유율(`object_fill_ratio`)

### 1차 분류기

- 회귀 전에 `is_gold_like`와 `material_class`를 계산한다.
- 분류 클래스:
  - `gold`
  - `non_precious`
  - `plated`
  - `plastic`
  - `unknown`

### 품질/실패 규칙

- 아래 조건 중 하나 이상이면 `needs_retake=true`
  - 하이라이트 과다
  - 그림자 과다
  - 배경 복잡도 과다
- 운영 플래그:
  - `non_gold_candidate`
  - `mixed_material_suspected`
  - `background_too_complex`
- 재촬영 권고 사유를 `reasons[]`에 기록

### 결과 정책

- 구간 확률 정규화 후 최고 확률 구간을 `karat_range`로 반환
- 신뢰도는 확률 최대치 + 품질 조건으로 `low/medium/high` 산정
- `non_gold_candidate` 또는 `mixed_material_suspected`가 있으면:
  - `result_usable=false`
  - K/함량 범위를 숨기고 "참고 불가" 메시지 출력
- `disclaimer` 고정 문구 포함:
  - "간편 모드 추정값은 참고용이며 거래/가격 결정에 사용할 수 없습니다."
  - "비금속/복합 소재 가능성이 높아 참고 불가입니다. 오프라인 전문 측정을 권장합니다."

## 4) API 계약

- 엔드포인트: `POST /api/measure`
- `mode`:
  - `single_image` (간편)
  - `upload` (정밀)
  - `synthetic` (연구용)

`single_image` 요청 예시:

```json
{
  "mode": "single_image",
  "images": ["data:image/jpeg;base64,...", "data:image/jpeg;base64,..."]
}
```

## 5) UX 가이드

- 간편 모드 탭을 기본 선택
- 재촬영 권고 시 다음 촬영 가이드 노출:
  - 흰 배경
  - 그림자 약하게
  - 정면 + 기울임 2장 촬영
- 정밀 모드는 별도 탭으로 유지하고 "편광+다각도" 요건 명시
