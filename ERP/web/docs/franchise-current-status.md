# Franchise Current Status

## 목적

프랜차이즈 고도화 작업의 현재 판단 기준만 짧게 모은다. 상세 히스토리는 `release-management.md`, 상세 검증은 `franchise-dev-qa-log.md`, 제품 방향과 백로그는 `franchise-growth-roadmap.md`를 기준으로 한다.

## 문서 운영 규칙

- 새 세션에서 현재 상태를 빠르게 잡을 때 이 문서를 먼저 본다.
- 배포, SQL 적용, 운영 샘플 데이터, P0 live QA 상태가 바뀌면 이 문서를 갱신한다.
- 긴 명령 출력, 브라우저 QA 상세, 코드 변경 이력은 이 문서에 누적하지 않고 관련 문서로 링크한다.
- `ERP/web/handoff.md`는 단일 작성자 규칙 때문에 수정하지 않는다.

## 2026-06-30 기준 현재 상태

- 작업 브랜치: `codex/franchise-next-alerts-20260616`
- 최신 배포 기준 커밋: 이번 OAuth 심사 영상 준비/공개 진입점 정리 커밋을 main에 반영한다.
- 공개 진입점: `/landing` 상단 메뉴에 `로그인` 링크를 추가했고, 로그인/가입/개인정보처리방침/metadata 브랜드 문구를 `FC ERP`로 정리했다. 신규 도메인 `https://www.fcerp.co.kr` 기준 영상 촬영과 OAuth 심사 준비에 맞춘다.
- 최근 작업 범위: 회원가입 화면을 `회사명 -> 아이디 -> 이메일 -> 비밀번호 -> 비밀번호 확인 -> 이름 -> 휴대폰 번호` 순서로 정리하고, 이메일 `@` 누락, 비밀번호 확인 불일치, 휴대폰 자동 하이픈 정책을 추가했다. 브랜드 임직원 가입은 백엔드에서 회사 팀장 유무에 따라 팀장 또는 매니저 권한으로 자동 접수한다. 어드민 관리 홈은 전자계약 사용량과 회사별 메뉴 관리를 전용 관리 메뉴로 분리했고, 전자계약 사용량과 회원 및 권한 관리는 검색/필터/정렬/페이지네이션을 지원한다.
- 알림 연동: Solapi SDK를 추가하고 회원가입 요청 시 관리자 문자, 승인 완료 시 신청자 문자를 발송한다. 문구 prefix는 `[ERP]`로 통일했다. Solapi env가 없거나 수신 번호가 없으면 발송만 skip하고 가입/승인 본 흐름은 막지 않는다.
- 데모 정리: `/demo` 가이드 오버레이와 상세 드로어를 실제 업무 흐름에 더 가깝게 맞추고, 대시보드/모객 DB/상세/승격 단계 설명과 딤드 위치를 조정했다.
- 점포개발 미팅 도구: 출점 검토 리포트의 간단 수익분석표에 회사 공용 프리셋 저장/적용/삭제를 추가했다. 프리셋은 목표매출 변화와 비용 항목만 공유하고 후보지별 보고 메모는 유지한다. 프리셋 영역은 한 줄에서 문구가 잘리지 않도록 정렬했고, 금액 입력은 `4,500`처럼 콤마가 표시된다.
- 배포 상태: 사용자가 실서버 배포를 명시 요청했다. 배포 결과는 이번 커밋 반영 후 최종 보고한다.
- 신규 SQL: 회사 공용 수익분석표 프리셋용 `supabase_franchise_location_meeting_tool_presets_migration.sql`은 사용자 확인 기준 실서버 등록 완료.
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
