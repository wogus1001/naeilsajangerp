# Franchise Current Status

## 목적

프랜차이즈 고도화 작업의 현재 판단 기준만 짧게 모은다. 상세 히스토리는 `release-management.md`, 상세 검증은 `franchise-dev-qa-log.md`, 제품 방향과 백로그는 `franchise-growth-roadmap.md`를 기준으로 한다.

## 문서 운영 규칙

- 새 세션에서 현재 상태를 빠르게 잡을 때 이 문서를 먼저 본다.
- 배포, SQL 적용, 운영 샘플 데이터, P0 live QA 상태가 바뀌면 이 문서를 갱신한다.
- 긴 명령 출력, 브라우저 QA 상세, 코드 변경 이력은 이 문서에 누적하지 않고 관련 문서로 링크한다.
- `ERP/web/handoff.md`는 단일 작성자 규칙 때문에 수정하지 않는다.

## 2026-06-24 기준 현재 상태

- 작업 브랜치: `codex/franchise-next-alerts-20260616`
- 최신 dev 배포 기준 커밋: `e4ad21d feat(franchise): refine opening readiness checklist`.
- 최근 작업 범위: 오픈 준비 체크리스트 1차 고도화. 기존 `franchise_opening_projects.tasks` JSON을 확장해 계약/행정, 인테리어, 교육, 초도물류, 홍보, 오픈일 6단계 25개 하위 항목을 제공하고, `확인요청`, 오늘 처리, 기한 임박, 진행 이슈, 오픈 가능도 요약을 추가했다. 계약완료 상세의 계약 전 서류 탭/버튼 표기는 `구비서류`로 통일했다. 신규 SQL은 없다.
- 최근 커밋 범위: `0e336e2 feat(franchise): add contract opening preparation tab`, `c65bdf8 feat(franchise): refine opening readiness checklist`로 계약완료 점주 상세 `오픈 준비` 탭과 1차 고도화를 커밋했다.
- 배포 상태: 오픈 준비 탭/체크리스트 1차 고도화는 `dev`에 `6859dca`, `e4ad21d`로 반영했고 Vercel Dev deployment `dpl_7cvvF2ttQNnoPDu1Vdv9gEomFozX`가 READY다. Dev alias는 `https://naeilsajang-dev.vercel.app`이다. main 반영은 아직 없다. 직전 실서버 배포는 2026-06-23 계약 준비/가맹 운영/물건지 지도 v1 묶음이다.
- 신규 SQL: 2026-06-24 문서함/업로드 보안 핫픽스, 물건지 지도 고도화, 계약완료 상세 오픈 준비 탭에는 신규 SQL 없음.
- SQL 적용 확인: 사용자 확인 기준 `supabase_franchise_lead_documents_migration.sql`, `supabase_franchise_contract_store_linkage_migration.sql`은 실서버 등록 완료.
- 운영 샘플 데이터:
  - 계약 체크 14일 경과 샘플: `contract_check_14day_seed_20260623`
  - 물건지 지도 목록 샘플: `지도QA_20260624_01`부터 `지도QA_20260624_30`, 메모 태그 `location_map_sample_20260624`

## 현재 확인할 Live QA

- 계약 완료 후보자 상세에서 구비서류 저장, 해당없음 저장, 업로드 문서 등록, signed URL 문서 열기, 완료 전자계약 연결/해제 확인.
- 계약 완료 후 가맹점 정보 생성이 후보지 주소/지역/좌표를 보존하는지 실계정으로 확인.
- 계약완료 상세 `오픈 준비` 탭에서 프로젝트 저장 후 새로고침 persistence를 실운영 세션으로 확인.
- 점주 문서함 삭제가 문서 레코드와 Storage 파일을 의도대로 정리하는지 확인.
- 문서함 인증 만료/무인증 401, `requesterId` 사칭 차단, 교차 회사 접근 차단과 협력업체 권한 범위 회귀 확인. 라우트 단위 사칭/범위 테스트는 로컬 자동화로 통과했으며, 실계정 UI 세션에서 한 번 더 확인한다.
- 물건지 지도는 실서버 Kakao 도메인에서 타일/마커/반경 원/측정 도구를 확인.

## 주요 문서 역할

- `MAC_CONTEXT.md`: 맥북 worktree, 배포 방식, 새 세션 시작 체크리스트.
- `ERP/web/README.md`: 실행, 환경변수, SQL 적용 순서.
- `ERP/web/docs/release-management.md`: 브랜치, 커밋, dev/main 반영, 배포 ledger.
- `ERP/web/docs/franchise-dev-qa-log.md`: 상세 개발/QA 이력과 미검증 리스크.
- `ERP/web/docs/franchise-growth-roadmap.md`: 제품 방향, API 정책, 다음 작업 목록.
- `ERP/web/docs/documentation-agent.md`: Docs Steward 권한과 문서 갱신 규칙.
