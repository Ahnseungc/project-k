# Gold Sparse Ellipsometry — Web Demo

Vercel에 배포할 Next.js 데모 UI입니다. UI는 [getdesign](https://www.npmjs.com/package/getdesign) **Airbnb** 스타일 가이드(`DESIGN.md`)를 따릅니다.

```bash
npx getdesign@latest add airbnb   # DESIGN.md 갱신 시
``` Python 백엔드와 동일한 파이프라인을 TypeScript로 포팅했으며, Ridge 회귀 가중치는 `lib/regressor.json`에 포함됩니다.

## 로컬 실행

```bash
cd web
npm install
npm run dev
```

http://localhost:3000

- **스마트폰 촬영** 탭: 각도마다 편광 0°/45°/90°/135° 사진 4장 + 최소 4각도
- **합성 시뮬** 탭: 알고리즘 검증용 가상 데이터

## Vercel 배포

1. [vercel.com](https://vercel.com)에서 New Project
2. **Root Directory**를 `gold-sparse-ellipsometry/web` 로 설정
3. Framework: Next.js (자동 감지)
4. Deploy

또는 CLI:

```bash
cd web
npx vercel
```

## API

```bash
curl -X POST https://YOUR_DOMAIN/api/measure \
  -H "Content-Type: application/json" \
  -d '{"mode":"synthetic","nominal_karat":18,"n_views":12}'
```

## 회귀 가중치 갱신

Python 모델 학습 후:

```bash
cd ..
PYTHONPATH=src python3 scripts/export_regressor_json.py
```

`web/lib/regressor.json`이 갱신됩니다.
