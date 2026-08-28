# 말로(Mallo) STT Final Showcase

고령 사용자를 위한 Voice-first 키오스크 주문 시스템 **말로(Mallo)**의 STT(Speech-to-Text) 최종 평가 정적 쇼케이스입니다.

- **GitHub Pages 배포 URL**: https://nanocode00.github.io/stt_showcase/

## 개요

- **모델**: `models/stt/final-train65-merged-bf16` (Whisper-medium QLoRA 카페 도메인 파인튜닝)
- **대표 발화 비교**: 직접 녹음한 16kHz mono WAV 5개에 대한 모델 전사 결과 및 판정 비교
- **독립 정적 배포**: 백엔드, API, 외부 네트워크 의존성 없이 GitHub Pages에서 100% 동작 (상대 경로 참조)

## 사이트 구성

- `index.html`: 통합 쇼케이스 메인 페이지 (5개 대표 발화 음성 청취, 실제 발화 vs STT 전사 비교, 오류 분석)
- `data/results.json`: 모델 정보, WAV 포맷, reference 텍스트, 전사 결과 및 재현 메타데이터
- `audio/`: 공개 사용이 확인된 직접 녹음 WAV 파일 5개

## 로컬 확인

```bash
python3 -m http.server 8000
```
브라우저에서 `http://localhost:8000/` 접속

## 참고 사항

- `inference_ms`는 재현 당시 CPU 처리 기록일 뿐 모델 성능 benchmark가 아닙니다.
- 본 쇼케이스의 5건은 청취 비교를 위한 대표 샘플이며, 전체 도메인 평가셋(506문장) 기준 정량 지표는 메뉴명 Recall 89.13%, CER 0.1095를 달성했습니다.
