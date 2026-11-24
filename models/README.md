# 자세 인식 모델 (고정본)

두 앱(스트림라인, 동작 분석)이 쓰는 MediaPipe Pose Landmarker 모델을 이 저장소에 고정해 둔 것입니다.
Google 배포 주소(`.../pose_landmarker_heavy/float16/latest/...`)는 "latest"라 예고 없이 바뀔 수 있어,
날짜끼리 비교하는 기록이 모델 교체로 달라지지 않도록 같은 파일을 여기서 받습니다.

| 항목 | 값 |
|---|---|
| 파일 | `pose_landmarker_heavy_float16_20230428.task` |
| 모델 | MediaPipe Pose Landmarker (Heavy), BlazePose GHUM, float16 |
| 원본 | https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task |
| 원본 Last-Modified | 2023-04-28 00:46:25 GMT |
| 크기 | 30,664,242 bytes |
| SHA-256 | `64437af838a65d18e5ba7a0d39b465540069bc8aae8308de3e318aad31fcbc7b` (2026-11-24 원본과 같음을 확인) |
| 실행 라이브러리 | `@mediapipe/tasks-vision@0.10.34` (jsDelivr, 앱 코드에 버전 고정) |

모델을 바꿀 때는 새 파일 이름(날짜 포함)으로 추가하고, 앱 코드의 경로와 이 표를 함께 바꾼 뒤
바꾸기 전·후 기록은 따로 비교합니다.
