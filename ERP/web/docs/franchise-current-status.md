# Franchise Current Status

## 목적

프랜차이즈 고도화 작업의 현재 판단 기준만 짧게 모은다. 상세 히스토리는 `release-management.md`, 상세 검증은 `franchise-dev-qa-log.md`, 제품 방향과 백로그는 `franchise-growth-roadmap.md`를 기준으로 한다.

## 문서 운영 규칙

- 새 세션에서 현재 상태를 빠르게 잡을 때 이 문서를 먼저 본다.
- 배포, SQL 적용, 운영 샘플 데이터, P0 live QA 상태가 바뀌면 이 문서를 갱신한다.
- 긴 명령 출력, 브라우저 QA 상세, 코드 변경 이력은 이 문서에 누적하지 않고 관련 문서로 링크한다.
- `ERP/web/handoff.md`는 단일 작성자 규칙 때문에 수정하지 않는다.

## 2026-07-01 기준 현재 상태

- 작업 브랜치: `codex/franchise-next-alerts-20260616`
- 최신 운영 배포 기준 커밋: `70bbf75 feat(franchise): split vendor contract registration flow` (`dpl_CfPurRkjSkWModDNQ9KzAbSyYLVZ`, `https://www.fcerp.co.kr` READY). 업체 계약함 등록/수정 전용 페이지 분리와 Vercel `naeilsajang` 프로젝트 Node.js 24.x 설정 정렬을 포함한다.
- 공개 진입점: `/landing` 상단 메뉴에 `로그인` 링크를 추가했고, 로그인/가입/개인정보처리방침/metadata 브랜드 문구를 `FC ERP`로 정리했다. Kakao 비즈니스 심사 대응을 위해 `/landing`, `/login`, `/signup`, `/privacy` 하단에 주식회사 내일사장 사업자정보 푸터를 노출한다. 신규 도메인 `https://www.fcerp.co.kr` 기준 영상 촬영과 OAuth/Kakao 심사 준비에 맞춘다.
- 최근 작업 범위: 회원가입 화면을 `회사명 -> 아이디 -> 이메일 -> 비밀번호 -> 비밀번호 확인 -> 이름 -> 휴대폰 번호` 순서로 정리하고, 이메일 `@` 누락, 비밀번호 확인 불일치, 휴대폰 자동 하이픈 정책을 추가했다. 브랜드 임직원 가입은 백엔드에서 회사 팀장 유무에 따라 팀장 또는 매니저 권한으로 자동 접수한다. 직원 관리는 `sub_manager` 매니저를 회사 직원 그룹에 포함하도록 보정했고, 개인정보 수정은 등록 이메일/휴대폰 수정과 팀장 전용 회사 로고 등록으로 정리했다. 개인정보 저장 핫픽스로 최종 프로필 재조회 company 관계를 `company_id` FK 명시 방식으로 보강했다. 진행현황의 입점 요청 목록은 회사명 옆에 작성자 표시를 추가했고, 입점 요청/예비 창업자 등록의 수정·삭제는 작성자, 같은 회사 팀장, 관리자만 가능하게 정리했다. 어드민 관리 홈은 전자계약 사용량과 회사별 메뉴 관리를 전용 관리 메뉴로 분리했고, 전자계약 사용량과 회원 및 권한 관리는 검색/필터/정렬/페이지네이션을 지원한다. 2026-07-01 플랫폼 코드리뷰로 legacy requester/admin fallback, UCanSign unsigned state, 서비스-role 주요 mutation route를 세션 기반 권한 검사로 보강했다. 이후 모객 DB/고객/명함/점포개발 화면의 legacy service route 호출부에 Supabase 세션 header를 붙이고, `BusinessCard`와 `PropertyCard`의 정적 순환 import를 동적 import로 끊어 명함 신규입력 client-side exception을 보강했다.
- 알림 연동: Solapi SDK를 추가하고 회원가입 요청 시 관리자 문자, 승인 완료 시 신청자 문자를 발송한다. 문구 prefix는 `[ERP]`로 통일했다. Solapi env가 없거나 수신 번호가 없으면 발송만 skip하고 가입/승인 본 흐름은 막지 않는다. 알림톡 1차 운영 관리를 위해 `/admin/alimtalk`을 추가했다. 어드민은 1,2,3,4,5,8번 발송 시나리오의 템플릿 검수 상태, SOLAPI template/channel ID, 시나리오 사용 여부, 회사별 월 발송량·한도·주의 기준, 최근 발송 로그를 관리한다. 시나리오 관리는 전체 발송 플로우 보드와 개별 시나리오 카드로 분리해 운영자가 전체 흐름과 개별 ON/OFF·대체 발송 설정을 함께 확인한다. 실제 Kakao/SOLAPI 템플릿 신청은 provider 콘솔에서 진행하고 ERP에는 승인 상태와 ID를 기록한다. 2차는 승인 템플릿과 운영 env 준비 후 실제 발송 훅 연결, 3차는 사용량/실패 분석과 수동 재발송·provider 상태 점검으로 분리한다.
- 데모 정리: `/demo` 가이드 오버레이와 상세 드로어를 실제 업무 흐름에 더 가깝게 맞추고, 대시보드/모객 DB/상세/승격 단계 설명과 딤드 위치를 조정했다.
- 점포개발 미팅 도구: 출점 검토 리포트의 간단 수익분석표에 회사 공용 프리셋 저장/적용/삭제를 추가했다. 프리셋은 목표매출 변화와 비용 항목만 공유하고 후보지별 보고 메모/상권분석 근거는 유지한다. 코드리뷰 보강으로 빈 `meetingTool` 저장 차단, UUID 검증, 프리셋 테이블 미적용 424 안내, 교차 회사 삭제 404 응답, 프리셋 목록 전환 초기화, 삭제 확인창, 비율 소수 입력 유지를 추가했다. UI는 `분석표 프리셋` 툴바로 분리해 목표매출 입력의 하위 옵션처럼 보이지 않게 정리했다. 2차 고도화로 PDF/인쇄 출력물을 목표매출 1~3차 비교표와 미팅 자료형 레이아웃으로 정리하고, 후보지별 `리포트 버전 이력` 저장/불러오기와 `상권분석·목표매출 근거` 섹션을 추가했다. 후보지 주소/좌표 기반 Kakao 상권 지도와 300m/500m/1km 반경 설정을 추가했고, 지도에는 확대/축소, 일반/스카이뷰/지적편집도 전환, 거리재기, 면적재기 도구를 제공한다. 측정 점은 후보지 `meetingTool.marketMap`에 저장되어 저장/버전/출력 후에도 유지되며, PDF/인쇄 출력물은 지도 타일, 마커, 반경 원, 측정 선·면·점만 표시하고 별도 좌표 기준 박스는 출력하지 않는다. 후속 코드리뷰로 미팅 도구 도메인 로직과 CSS를 컴포넌트 전용 모듈로 분리해 유지보수 리스크를 낮췄다.
- 업체 계약함/업체 관리: 프랜차이즈 메뉴에 `/contracts/vendor` 업체 계약함과 `/dashboard/franchise-vendors` 업체 관리를 추가했다. 업체 계약함은 물류, 식자재, 인테리어, 마케팅, 임대차, 기타 계약을 회사 범위로 등록하고, 기존 전자계약 문서 연결 또는 파일 업로드 문서 보관을 지원한다. 업로드 문서는 `property-documents/franchise-vendor-contracts/<company>/<contract>/...` 경로에 저장하고 signed URL로 열람한다. 계약 만료 D-30/D-7 알림은 기존 프랜차이즈 인앱 알림에 연동하며, 수신자는 계약 담당자와 회사 팀장이다. 2차-2A로 만료 업무 큐, 계약 상세 패널, 갱신/종료 처리, 처리 이력 테이블을 추가했다. 갱신은 원본 계약을 `갱신완료`로 닫고 새 `진행중` 계약을 복사 생성하며, 종료는 사유와 함께 `해지` 상태로 기록한다. 업체 관리는 `franchise_vendors` 업체 마스터를 직접 등록/수정하고, 계약함에서 업체 마스터를 선택한 계약은 `vendor_id` 기준으로 우선 병합한다. 기존 직접입력 계약은 업체명 fallback으로 병합해 업체별 계약 수, 진행/관리 필요 건수, 다음 만료 계약, 최근 메모를 보여준다. `업체 생성` 버튼은 업체 목록 섹션 안에서 폼을 열며, 계약함의 `업체 선택`은 업체 관리 마스터를 불러와 구분/업체명을 자동 입력한다. 업체 계약함 목록 화면은 검색/큐/계약 목록과 `계약 등록` 버튼 중심으로 정리했고, 신규 등록과 수정은 `/contracts/vendor/register` 전용 페이지에서 처리한다. 계약 상세는 행 선택 시 목록 아래에 열린다. 증거 묶음 PDF 출력은 이번 범위에서 제외했다.
- 가맹 운영 슈퍼바이징: `/dashboard/franchise-operations` 가맹 운영 탭을 `대시보드 / 슈퍼바이징 / 가맹점 목록 / 가맹점 등록`으로 확장했다. 슈퍼바이징 탭은 오늘/이번주 방문, 미제출 보고서, 승인 대기, 시정요청 진행 요약과 SV 배정, 방문 점검 일정, 점검 보고서 저장/제출, 관리자 승인/반려, 시정요청 상태 변경을 제공한다. `admin`/`manager`는 회사 전체를 관리하고, 일반 직원/SV는 본인 관련 배정·방문·보고서 중심으로 조회/작성한다. 사진 첨부는 `property-documents/franchise-supervision/<company>/<report>/...` 메타데이터 저장까지 지원하며 PDF 보고서와 알림톡 자동 발송은 2차로 둔다.
- 배포 상태: 직원 관리/개인정보 수정 보강, 개인정보 저장 핫픽스, 공개 사업자정보 푸터, 진행현황 권한/삭제, 출점 검토 리포트 버전 이력·상권분석 근거, legacy requester/admin fallback 제거 보안 하드닝, 모객 DB/고객/명함/점포개발 화면 세션 header 보강, 출점 검토 리포트 Kakao 상권 지도, 업체 계약함 등록/수정 페이지 분리, Vercel `naeilsajang` 프로젝트 Node.js 24.x 정렬은 운영 배포 완료 상태다. 배포 전 Vercel dry-run에서 `.env*`, `.omo`, `MAC_CONTEXT.md`, `ERP/web/handoff.md`, `.next`, `.vercel`, `node_modules` 제외를 확인했고, 운영 inspect에서 `name=naeilsajang`, `target=production`, `status=Ready`를 확인한다.
- 신규 SQL: 회사 공용 수익분석표 프리셋용 `supabase_franchise_location_meeting_tool_presets_migration.sql`과 후보지별 리포트 버전 이력용 `supabase_franchise_location_meeting_tool_versions_migration.sql`은 사용자 확인 기준 실서버 등록 완료.
- 신규 SQL: 업체 계약함용 `supabase_franchise_vendor_contracts_migration.sql`은 업체 마스터 연동용 `vendor_id` 컬럼/인덱스/FK를 추가하도록 보강했다. 사용자 확인 기준 `supabase_franchise_vendors_migration.sql`, 보강된 `supabase_franchise_vendor_contracts_migration.sql`, 업체 계약 갱신/종료 이력용 `supabase_franchise_vendor_contract_events_migration.sql`은 Supabase SQL Editor 등록 완료.
- 신규 SQL: 알림톡 운영 관리용 `supabase_franchise_alimtalk_operations_migration.sql`을 추가했다. 이 SQL은 `alimtalk_templates`, `alimtalk_scenarios`, `alimtalk_company_settings`, `alimtalk_send_logs`와 6개 기본 템플릿/시나리오 seed를 포함한다. 대상 Supabase 환경에는 사용자가 직접 SQL을 등록해야 한다.
- 신규 SQL: 가맹 운영 슈퍼바이징용 `supabase_franchise_supervision_migration.sql`을 추가했다. 이 SQL은 SV 배정, 방문 일정, 점검 보고서, 시정요청 테이블과 상태 제약/인덱스/RLS를 포함한다. 대상 Supabase 환경에는 사용자가 직접 SQL을 등록해야 한다. **SQL 등록 필요**.
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
- 출점 검토 리포트 회사 공용 프리셋의 저장/불러오기/삭제 persistence를 실계정 UI 세션에서 한 번 더 확인한다. 로컬 데모 모달 QA와 라우트 단위 범위 테스트는 통과했다.
- 출점 검토 리포트에서 현재안 버전 저장, 버전 목록 최신순 표시, 이전안 불러오기, 저장 버튼으로 현재안 반영 persistence, 상권분석·목표매출 근거의 버전 snapshot 왕복을 실계정 UI 세션에서 확인한다.
- 운영 배포 후 실계정으로 명함 목록/상세 저장/삭제/DB 동기화, 매물카드 추진고객 명함 연동, 대시보드 메모 자동 저장, UCanSign 연결/계약 목록 조회가 새 세션 권한 검사에서 정상 동작하는지 확인한다.
- 운영 배포 후 실계정으로 모객 DB, 고객 목록/상세, 명함 목록/신규입력, 점포 목록/상세/신규등록에서 `requesterId is required` 오류와 client-side exception이 재발하지 않는지 확인한다.
- `미래` 회사 팀장 실계정으로 직원 관리에서 매니저/담당자/협력업체 목록과 승인 대기 요청이 모두 보이는지 운영 배포 후 확인한다.
- 개인정보 수정에서 이메일/휴대폰 저장 후 성공 모달이 뜨고 새로고침 후 값이 유지되는지 실계정 UI 세션에서 확인한다. 로컬 production mock QA는 통과했다.
- `미래` 회사 진행현황에서 입점 요청 행이 `미래 / 작성자 ... / 공실` 형태로 보이는지 운영 배포 후 확인한다.
- 진행현황에서 입점 요청/예비 창업자 등록의 수정·삭제 버튼이 작성자, 팀장, 관리자에게만 보이고, 일반 직원/협력업체에는 권한 안내만 보이는지 운영 배포 후 실계정으로 확인한다.
- 공개 페이지 `/landing`, `/login`, `/signup`, `/privacy` 하단의 사업자정보가 운영 도메인에서 노출되고 Kakao 비즈니스 심사 화면에서 동일 정보로 인식되는지 확인한다.
- 물건지 지도는 실서버 Kakao 도메인에서 타일/마커/반경 원/측정 도구를 확인.
- 업체 계약함 SQL 적용 후 실계정으로 업체 계약 신규 등록, 업로드 문서 열람 signed URL, 전자계약 연결, 수정/삭제, D-30/D-7 알림 생성을 확인한다. 이벤트 SQL 적용 후 실계정으로 갱신 처리, 새 계약 생성, 종료/해지 처리, 처리 이력 최신순 표시, 만료 업무 큐 카운트와 필터를 확인한다.
- 알림톡 운영 SQL 적용 후 admin 실계정으로 `/admin/alimtalk`에서 템플릿 상태/ID 저장, 시나리오 ON/OFF 저장, 회사별 월 한도·주의 기준 저장, 발송 로그 빈 상태와 schema-ready 상태를 확인한다.
- 슈퍼바이징 SQL 적용 후 실계정으로 `/dashboard/franchise-operations` 슈퍼바이징 탭에서 SV 배정 생성, 방문 일정 생성, 보고서 임시저장/제출, 관리자 승인/반려, `개선필요` 항목의 시정요청 생성과 상태 변경 persistence를 확인한다.

## 주요 문서 역할

- `MAC_CONTEXT.md`: 맥북 worktree, 배포 방식, 새 세션 시작 체크리스트.
- `ERP/web/README.md`: 실행, 환경변수, SQL 적용 순서.
- `ERP/web/docs/release-management.md`: 브랜치, 커밋, dev/main 반영, 배포 ledger.
- `ERP/web/docs/franchise-dev-qa-log.md`: 상세 개발/QA 이력과 미검증 리스크.
- `ERP/web/docs/franchise-growth-roadmap.md`: 제품 방향, API 정책, 다음 작업 목록.
- `ERP/web/docs/documentation-agent.md`: Docs Steward 권한과 문서 갱신 규칙.
