# GOM AD 배포 가이드 (Deployment Guide)

이 프로젝트는 **Full-stack (Vite + Express)** 구조로 제작되었습니다. 일반적인 GitHub Pages와 같은 정적 호스팅 서비스에서는 서버 기능이 작동하지 않습니다.

## 1. 권장 배포 방법: Google Cloud Run
AI Studio의 우측 상단에 있는 **'Deploy'** 버튼을 사용하는 것이 가장 간단하고 확실한 방법입니다.
- **장점**: Express 서버가 그대로 실행되어 텔레그램 알림, AI 챗봇이 완벽하게 작동합니다.
- **도메인 설정**: 배포 후 생성된 URL을 `gomad.co.kr`과 연결할 수 있습니다.

## 2. GitHub Pages를 사용하고 싶다면? (비권장)
GitHub Pages를 사용하려면 프로젝트를 **Static-only**로 변경해야 합니다.
- **문제점**: `/api/notify`, `/api/chat` 경로를 처리할 서버가 없으므로 알림과 AI 기능이 먹통이 됩니다.
- **해결책**: 해당 기능을 Firebase Functions와 같은 별도의 Serverless API로 옮겨야 합니다.

## 3. gomad.co.kr 404 에러 해결 방법
현재 도메인에서 404가 뜨는 것은 배포 설정이 되지 않았기 때문입니다.
1. **Cloud Run 배포**: AI Studio에서 배포를 완료합니다.
2. **DNS 설정**: 가비아 또는 사용 중인 도메인 관리 사이트에서 CNAME 또는 A 레코드를 Cloud Run의 주소로 변경해야 합니다.

**도움이 필요하시면 언제든 말씀해주세요!**
