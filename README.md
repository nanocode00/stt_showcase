# Mallo STT Final Showcase

직접 녹음한 다섯 개의 16kHz mono WAV에 `final-train65-merged-bf16`을 적용한 정적 결과물입니다.

- `index.html`: 입력 WAV 재생, 실제 발화, STT 전사와 일치/오류 표시
- `audio/`: 공개 사용이 확인된 직접 녹음 WAV 5개
- `data/results.json`: 모델, WAV 형식, reference, 전사 및 재현 메타데이터

모든 자산은 상대 경로로만 연결됩니다. 마이크, backend, API, 외부 도메인, API 키 및 토큰이 필요하지 않아 GitHub Pages에서 정적으로 동작합니다.

`inference_ms`는 재현 당시 CPU 처리 기록일 뿐 모델 성능 benchmark가 아닙니다.
