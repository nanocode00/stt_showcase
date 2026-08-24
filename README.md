# Mallo STT Live Showcase

브라우저 마이크로 직접 말하고 Mallo의 현재 Best STT 모델 전사를 확인하는 push-to-talk 쇼케이스입니다.

- Model: Train65 / lr=2e-5 / 2epoch
- Base: `openai/whisper-medium`
- Inference: 별도 FastAPI GPU backend
- Audio: 사용자가 직접 녹음한 요청만 전송하며 저장소에는 AI Hub audio/reference를 포함하지 않습니다.
- UI: Listening → Processing → Done 상태, transcription, inference latency 표시
- Limit: 녹음 최대 20초, backend 기본 업로드 제한 5 MiB, GPU inference 동시 실행 1건

## Backend 연결

정적 frontend의 [`config.js`](config.js)에서 공개 HTTPS endpoint만 교체합니다.

```js
window.MALLO_SHOWCASE_CONFIG = {
  API_BASE_URL: "https://your-backend.example.com",
  REQUEST_TIMEOUT_MS: 90000,
};
```

backend CORS에는 Pages origin을 설정합니다.

```bash
export MALLO_SHOWCASE_ALLOWED_ORIGINS=https://nanocode00.github.io
```

## Cloudflare Quick Tunnel

WSL에서 backend와 Quick Tunnel을 각각 실행합니다.

```bash
MALLO_SHOWCASE_ALLOWED_ORIGINS=https://nanocode00.github.io \
PYTHONPATH=src .venv/bin/uvicorn adapters.stt.live_showcase_api:app \
  --host 127.0.0.1 --port 8000

cloudflared tunnel --url http://127.0.0.1:8000
```

Quick Tunnel의 `trycloudflare.com` endpoint는 `cloudflared`를 재시작할 때마다 바뀝니다. 재시작 후 새 주소를 `config.js`의 `API_BASE_URL`에 반영하고 frontend를 다시 배포해야 합니다. 현재 단계에서는 Named Tunnel이나 별도 도메인을 사용하지 않습니다.

현재 배포 설정의 임시 endpoint(2026-08-24)는 `https://murphy-belongs-behavioral-minimize.trycloudflare.com`입니다. 해당 `cloudflared` 프로세스가 종료되면 이 주소는 더 이상 동작하지 않습니다.

API 주소가 비어 있을 때 UI는 설정 안내를 표시합니다. GitHub Actions는 사용하지 않고 `gh-pages` 브랜치 root를 직접 배포합니다.
