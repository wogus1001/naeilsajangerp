# Franchise Current Status

## 목적

프랜차이즈 고도화 작업의 현재 판단 기준만 짧게 모은다. 상세 히스토리는 `release-management.md`, 상세 검증은 `franchise-dev-qa-log.md`, 제품 방향과 백로그는 `franchise-growth-roadmap.md`를 기준으로 한다.

## 문서 운영 규칙

- 새 세션에서 현재 상태를 빠르게 잡을 때 이 문서를 먼저 본다.
- 배포, SQL 적용, 운영 샘플 데이터, P0 live QA 상태가 바뀌면 이 문서를 갱신한다.
- 긴 명령 출력, 브라우저 QA 상세, 코드 변경 이력은 이 문서에 누적하지 않고 관련 문서로 링크한다.
- `ERP/web/handoff.md`는 단일 작성자 규칙 때문에 수정하지 않는다.

## 2026-07-16 진행현황 검색·삭제 이력 보강

- `/dashboard/franchise-leads/work-intake`는 입점 요청과 예비 창업자 등록의 검색, 실제 상태 필터, 기간 필터, 10건 페이지네이션을 제공한다. 같은 회사 내부 직원은 목록을 함께 확인하되 수정·삭제는 실제 작성자, 팀장, 관리자만 가능하고, 협력업체는 본인 작성 건만 조회한다.
- 관리자에게만 `삭제 목록` 탭을 노출하며 유형, 제목, 회사, 삭제자, 삭제일, 요약을 확인한다. `상세 확인`은 삭제 시점 스냅샷을 기존 입점 요청·예비 창업자 확인 화면과 같은 읽기 전용 폼으로 복원해 임대 조건, 면적, 지원 조건, 상담 내용, 후속 조치, 첨부 등 전체 등록 내용을 보여준다. 과거 URL-only 첨부도 현재 Supabase origin과 삭제 원본 ID 경로가 모두 일치할 때만 열며, 삭제 이력을 저장할 수 없으면 원본도 삭제하지 않는 fail-closed 정책을 사용한다.
- 사이드바는 현재 URL과 일치하는 전체 메뉴 중 가장 구체적인 경로 하나만 활성화한다. `/dashboard/franchise-leads/work-intake`에서는 `업무 > 진행현황`만 선택되고 상위 경로가 겹치는 `프랜차이즈 > 모객 DB`는 함께 선택되지 않는다.
- 최신 `supabase_franchise_work_intake_deleted_records_migration.sql`은 원본 row 잠금, 서버측 전체 스냅샷, 중복 방지, 삭제 건수 검증을 포함한다. 사용자 확인 기준 2026-07-16 운영 DB에 최신 파일 적용을 완료했다. **SQL 등록 완료 확인**.
- 검색·삭제 이력과 전체 삭제 상세, 메뉴 단일 활성 보정은 `main` `406d1e8`과 production `dpl_2TgCq8wZCbmxvZZMKEeizuFC264Y`에 반영됐다. 두 운영 도메인과 진행현황 경로의 200 응답, 배포 직후 runtime error 0건을 확인했다. 작성자/일반 직원/팀장/관리자/협력업체 실계정 권한과 실제 삭제 이력 persistence는 운영 live QA로 계속 추적한다.

## 2026-07-15 기준 현재 상태

- 순차 개발 현재 단계: 전자결재 1단계는 문서함·결재선·첨부·PDF·알림 QA와 보안 SQL 적용을 마쳐 `완료`다. 가맹운영 일정·알림 2단계는 원천 연결, 상태·담당자 수명주기, 저장소 경계, 내구성 재처리, 자동/mock-session QA와 코드 보안 보정을 마쳤다. 신규 내구성 SQL 적용 확인 전까지 `코드 완료·SQL 적용 대기` 상태다.
- 2단계 알림·일정 1차: 헤더 알림에 `전자결재/가맹운영` 구분과 서버 필터를 추가하고 기존 `source_type`으로 분류한다. 가맹운영 일정에서는 전자결재 행과 `승인 대기` KPI를 제외하며, 전자결재 요청은 헤더 알림과 `/approvals`에서 처리한다. 가맹점·인력 세팅·슈퍼바이징·오픈 준비·업무 접수의 브라우저 기본 알럿/확인은 공용 중앙 커스텀 다이얼로그로 전환한다. 다이얼로그는 동시 요청을 순서대로 처리하고 알림 상세 이동은 앱 내부 경로만 허용한다. 신규 SQL은 없다.
- 2단계 원천 일정 1차: 업체 계약 만료일과 정보공개서 계약 가능일을 가맹 운영 일정으로 동기화하는 구현·자동 검증·mock-session 브라우저 QA를 완료했다. 수동·자동·원천 연동을 포함한 모든 프랜차이즈 일정은 `franchise_schedules`와 `/dashboard/franchise-operations/schedule`만 사용하며, 점포개발·전사 업무용 `schedules`, `/api/schedules`, `/schedule`에는 저장하거나 표시하지 않는다. 계약 ID와 후보자 ID를 원천 키로 사용해 반복 동기화 시 한 건만 유지하고, 계약 종료일 제거도 기존 갱신 일정을 취소한다. 정보공개서와 업체 계약 일정에는 원천 화면 바로가기를 제공하며 일반 알림 조회는 일정을 다시 쓰지 않는다. `supabase_franchise_source_schedule_upsert_migration.sql`과 `supabase_franchise_source_schedule_profile_security_migration.sql`은 사용자 확인 기준 대상 DB 적용 완료다. **SQL 등록 완료 확인**.
- 2단계 원천 일정 2차: SV 방문·보고서·시정요청, 오픈 준비, 점주 시설 문의·체크리스트 완료 요청을 `franchise_schedules`에 연결했다. 생성·변경·완료·취소와 담당자 재배정 시 일정 및 알림 수신자를 갱신하고, 오픈 예정일 제거는 기존 일정을 취소하며 반려 보고서는 재작성 진행 업무로 유지한다. 같은 회사라도 비활성 담당자는 새 업무에 지정할 수 없고, 저장된 기존 담당자가 비활성화되면 일정·알림 수신자에서 제외하며 점주 업무는 활성 회사 관리자로 대체한다. 보고서 재상신 시 기존 완료 시정조치의 상태·기한을 덮어쓰지 않고 해당 일정만 다시 동기화한다. 원천 상세 링크는 앱 내부 `/dashboard` 경로만 허용하고, 오픈 준비는 해당 가맹 희망자 상세의 오픈 준비 화면으로, 점주 시설 문의는 해당 제출 건이 펼쳐진 제출 처리 화면으로, 시정조치는 해당 행이 강조된 승인·시정요청 화면으로 이동한다. 체크리스트 완료 기록은 체크리스트 발송 현황으로 이동한다. 기존 SV 파일럿의 `schedules` 연결은 새 경로에서 사용하지 않으며, 남아 있는 레거시 source 행도 `/api/schedules` 응답과 수정·완료 처리에서 차단해 점포개발·전사 달력과 대시보드에 표시하지 않는다.
- 2단계 내구성 보강: 프로필 보안 SQL은 적용 완료했다. 원천 일정과 수신자 알림을 PostgreSQL 트랜잭션과 advisory lock 안에서 함께 갱신하고, 일시 실패는 `franchise_schedule_sync_jobs`에 최신 payload로 보관해 예약 실행에서 재시도한다. 매일 KST 자정에는 미완료 과거 일정을 `지연`으로 승격한다. `supabase_franchise_schedule_durable_sync_migration.sql` **SQL 등록 필요**.
- 2단계 후속 운영 고도화: 기존 SV 파일럿 `schedules` 행의 이관·종료와 적용 DB 실계정 원천 회귀는 운영 백로그로 관리한다. 남은 브라우저 기본 팝업 제거는 별도 UI 운영 고도화다.
- 기본 배포 절차: 일반 기능은 최신 dev에서 브랜치를 만들고 `feature -> dev PR -> dev 배포·QA -> main PR -> production` 순서로 승격한다. dev 전체가 운영 준비 상태가 아니면 dev PR의 최종 반영 커밋만 `origin/main` 기반 release 브랜치로 선별하고, 해당 release preview에서 smoke와 회귀 QA를 다시 통과한 뒤 main PR을 만든다.
- 최신 통합 릴리스: 플랫폼 코드리뷰 보정은 PR #4, main 릴리스 문서 동기화는 PR #6, 업무 접수 모바일 접근성 보정은 PR #7과 #8을 거쳐 `dev`에 반영했다. `dev -> main` PR #5를 병합한 운영 기준 커밋은 `7306723`이며, 병합 직후 `origin/dev`와 `origin/main`의 파일 트리가 같은 것을 확인했다.
- 통합 코드 배포 기록: `naeilsajang` production 배포 `dpl_45fnu8CDmTTJpFhi6Jk2uVnX84sL`이 `READY`였으며 source URL은 `https://naeilsajang-lx0yaxcx4-jaehyuns-projects-b4d20c6f.vercel.app`이다. `https://www.fcerp.co.kr`, `https://fcerp.co.kr` alias와 `/login`, `/approvals`, `/dashboard/franchise-operations/schedule` 200 응답을 확인했다. 문서 커밋으로 후속 deployment가 생성될 수 있으므로 실제 최신 deployment ID는 운영 도메인 최종 inspect 결과를 기준으로 한다.
- 최신 QA: 다이얼로그 큐, 알림 링크 보안, 가맹 운영 원천 일정 분리와 원천별 상태 전이를 포함한 집중 테스트를 통과했다. 가맹운영 일정은 mock-session 기준 1440px/390px에서 원천 배지·필터·상세 이동·완료 중앙 알럿을 확인했고 가로 넘침은 없었다. 전체 테스트, `tsc`, `lint`, `build`, `git diff --check`의 최종 결과는 `franchise-dev-qa-log.md`를 기준으로 한다.
- 대시보드 일정·알림 분리: 전자결재 요청은 헤더 알림과 `/approvals/pending` 결재 대기에서 처리하고, 루트 대시보드의 `예정된 일정` 목록과 단기 일정 건수에서는 제외한다. 회의, 방문, 마감 등 실제 캘린더 일정과 개인 일정의 기존 노출 규칙은 유지한다.
- 전자결재 PDF 저장: 문서 상세는 Supabase bearer 세션을 포함한 fetch로 PDF와 첨부파일을 받은 뒤 Blob 다운로드를 실행한다. API는 Noto Sans KR TrueType 글꼴을 서버 인스턴스에서 재사용하고 완성된 PDF 바이트를 내려준다. 로컬 실계정에서 10,343바이트 PDF를 내려받아 A4 1페이지의 한글 제목·본문·푸터가 보이고 빈 페이지가 아님을 확인했다. 이 보정 자체의 신규 SQL은 없다.
- SQL 적용 상태: 사용자 확인 기준 전자결재 SQL 기본 적용과 REST schema 접근 점검은 완료했다. 이후 캐시 호출자 검증과 만료·해제 위임 접근 차단을 추가한 최신 `supabase_company_approvals_security_review_migration.sql`, `supabase_company_approvals_workflow_schedule_fix_migration.sql`, `supabase_franchise_schedule_visibility_migration.sql`은 아래 순서로 다시 적용해야 한다. **SQL 재등록 필요**.
- 이번 복구 릴리즈 기준: 기능 브랜치 `codex/franchise-next-alerts-20260616`의 `955f42b feat(franchise): 공통 일정 결재 기반 추가`를 `main`의 `12ba4fb merge: 공통 일정과 점주 소통 운영 반영`으로 통합했다. 점주 포털 회사별 단축 로그인, 공지/공문 첨부와 삭제 연동, 체크리스트 발송 이력 목록, 문의 알림톡, 공통 일정·결재 MVP를 포함한다. 이 main-first 통합은 이미 production에 직접 배포된 소스를 복구한 일회성 예외다.
- 운영 기능 기준: main `b6d4559 fix(schedule): 보호 API 인증 헤더 보강` 소스를 `dpl_7am4D2Devjn3EQhGE8ZYhUQVekNW`에서 `naeilsajang` production에 배포했고 Vercel inspect `status=Ready`와 두 운영 도메인 alias를 확인했다. 이후 릴리즈 문서 전용 main 커밋은 애플리케이션 코드를 바꾸지 않으며 Vercel Git 연동의 후속 자동 배포가 생성될 수 있으므로, 실제 최신 deployment ID는 마지막 main push 이후 최종 inspect를 기준으로 확인한다. 이번 예외 릴리즈는 기능 브랜치 직접 배포 후 main/dev 기준점 복구까지 완료한 상태다.
- SQL 상태: `supabase_franchise_approval_calendar_migration.sql`은 사용자 확인 기준 2026-07-10 운영 DB 적용 완료다. **SQL 등록 완료 확인**. dev와 production Supabase 프로젝트가 분리된 환경에서는 각 환경 적용 여부를 별도로 확인한다.
- 진행현황 입점 요청 상세: 등록 주소를 Kakao 지도와 `카카오맵에서 보기` 링크로 연결하고, 여러 첨부 이미지는 큰 사진·썸네일·좌우 이동 버튼으로 연속 확인한다. 임대 조건 요약과 보증금·월세·관리비·권리금 입력은 천 단위 쉼표를 표시하되 저장 payload의 기존 숫자 정규화는 유지한다. 이번 변경의 신규 SQL은 없다.
- 공개 진입점: `/landing` 상단 메뉴에 `로그인` 링크를 추가했고, 로그인/가입/개인정보처리방침/metadata 브랜드 문구를 `프랜차이즈 본부 ERP`로 정리했다. Kakao 비즈니스 심사 대응을 위해 `/landing`, `/login`, `/signup`, `/privacy` 하단에 주식회사 내일사장 사업자정보 푸터를 노출한다. 신규 도메인 `https://www.fcerp.co.kr` 기준 영상 촬영과 OAuth/Kakao 심사 준비에 맞춘다.
- 최근 작업 범위: 회원가입 화면을 `회사명 -> 아이디 -> 이메일 -> 비밀번호 -> 비밀번호 확인 -> 이름 -> 휴대폰 번호` 순서로 정리하고, 이메일 `@` 누락, 비밀번호 확인 불일치, 휴대폰 자동 하이픈 정책을 추가했다. 브랜드 임직원 가입은 백엔드에서 회사 팀장 유무에 따라 팀장 또는 매니저 권한으로 자동 접수한다. 직원 관리는 `sub_manager` 매니저를 회사 직원 그룹에 포함하도록 보정했고, 개인정보 수정은 등록 이메일/휴대폰 수정과 팀장 전용 회사 로고 등록으로 정리했다. 개인정보 저장 핫픽스로 최종 프로필 재조회 company 관계를 `company_id` FK 명시 방식으로 보강했다. 진행현황의 입점 요청 목록은 회사명 옆에 작성자 표시를 추가했고, 입점 요청/예비 창업자 등록의 수정·삭제는 작성자, 같은 회사 팀장, 관리자만 가능하게 정리했다. 진행현황의 `수정` 액션은 `확인/수정`으로 바꾸고, 입점요청/예비 창업자 등록 상세 모달에서 등록 요약과 첨부 자료를 먼저 확인한 뒤 기존 권한 정책 그대로 수정할 수 있게 보강했다. 입점요청 등록은 현재 상태가 `영업중`일 때 `현재 영업중 상호/매장명`을 `properties.data.operatingStoreName`에 저장한다. 새 첨부는 이미지/PDF를 Storage에 업로드해 열람/다운로드 링크를 제공하고, 과거처럼 URL 없이 파일명/용량만 저장된 첨부는 원본이 없어 `재첨부 필요`로 안내한다. 어드민 관리 홈은 전자계약 사용량과 회사별 메뉴 관리를 전용 관리 메뉴로 분리했고, 전자계약 사용량과 회원 및 권한 관리는 검색/필터/정렬/페이지네이션을 지원한다. 2026-07-01 플랫폼 코드리뷰로 legacy requester/admin fallback, UCanSign unsigned state, 서비스-role 주요 mutation route를 세션 기반 권한 검사로 보강했다. 이후 모객 DB/고객/명함/점포개발 화면의 legacy service route 호출부에 Supabase 세션 header를 붙이고, `BusinessCard`와 `PropertyCard`의 정적 순환 import를 동적 import로 끊어 명함 신규입력 client-side exception을 보강했다.
- 알림 연동: Solapi SDK를 추가하고 회원가입 요청 시 관리자 문자, 승인 완료 시 신청자 문자를 발송한다. 문구 prefix는 `[ERP]`로 통일했다. 입점요청과 예비 창업자 등록이 저장되면 `FRANCHISE_INTAKE_ALERT_PHONES` 수신 번호로 등록 완료 문자를 발송하고, 해당 env가 비어 있으면 `SIGNUP_ADMIN_ALERT_PHONES`를 fallback으로 사용한다. Solapi env가 없거나 수신 번호가 없으면 발송만 skip하고 가입/승인/인입 등록 본 흐름은 막지 않는다. 알림톡 1차 운영 관리를 위해 `/admin/alimtalk`을 추가했다. 어드민은 1,2,3,4,5,8번 발송 시나리오의 템플릿 검수 상태, SOLAPI template/channel ID, 시나리오 사용 여부, 회사별 월 발송량·한도·주의 기준, 최근 발송 로그를 관리한다. 시나리오 관리는 전체 발송 플로우 보드와 개별 시나리오 카드로 분리해 운영자가 전체 흐름과 개별 ON/OFF·대체 발송 설정을 함께 확인한다. 실제 Kakao/SOLAPI 템플릿 신청은 provider 콘솔에서 진행하고 ERP에는 승인 상태와 ID를 기록한다. 승인된 알림톡은 회원가입 승인 요청/완료, 정보공개서 수령 확인 완료, 가맹계약 가능 상태, 업체 계약 D-30/D-7, 점주 공지/공문 발행, 점주 시설/고장 문의 접수, 점주 포털 계정 발급 이벤트에 연결했다. 검수중인 정보공개서 확인 안내 템플릿은 승인 전까지 실제 발송 훅에서 제외한다. 3차는 사용량/실패 분석과 수동 재발송·provider 상태 점검으로 분리한다.
- 2026-07-03 알림톡 보정: 어드민 홈 관리 메뉴는 `회원 및 권한 관리`, `회사별 메뉴 관리`, `프랜차이즈 인입 관리`, `전자계약 관리`, `알림톡 운영 관리`, `시스템 설정` 순서로 정리했다. `/admin/alimtalk` 템플릿 관리에서는 별도 사용 체크와 본문 미리보기를 제거했고, 시나리오 관리에서는 전체 발송 플로우와 시나리오 사용 체크를 제거했다. 각 시나리오의 템플릿 노드를 눌렀을 때 카카오 알림톡 미리보기와 변수 칩을 확인한다. 정보공개서 Gmail 발송 폼은 `후보자명`을 필수 입력으로 받고, 발송 전 `정보공개서 확인 안내` 알림톡 목업을 보여준다. Gmail 발송 성공 시 후보자 휴대폰으로 `disclosure_email_sent` 알림톡을 발송하고, 수령 확인 버튼 클릭 시 기존 `disclosure_confirmed` 알림톡과 14일 기준 감사 기록을 유지한다. `disclosure_confirmed` 변수는 `후보자명`, `확인일`, `수령확인일`, `수령일`, `계약가능일`, `계약가능예정일`을 모두 채운다. `franchise_contract_eligible` 가맹계약 가능 상태 알림톡도 승인 템플릿 차이를 흡수하도록 `후보자명`, `예비창업자명`, `확인일`, `수령확인일`, `수령일`, `계약가능일`, `계약가능예정일`, `가능일`을 모두 채운다. 메일 열람 추정은 법적 확정 신호가 아니라 내부 참고 신호로만 사용한다. 발송 또는 열람 추정 후 1일 이상 수령 확인이 없으면 `정보공개서 수령 미확인` 내부 업무 큐를 생성한다.
- 데모 정리: `/demo` 가이드 오버레이와 상세 드로어를 실제 업무 흐름에 더 가깝게 맞추고, 대시보드/모객 DB/상세/승격 단계 설명과 딤드 위치를 조정했다.
- 점포개발 미팅 도구: 출점 검토 리포트의 간단 수익분석표에 회사 공용 프리셋 저장/적용/삭제를 추가했다. 프리셋은 목표매출 변화와 비용 항목만 공유하고 후보지별 보고 메모/상권분석 근거는 유지한다. 코드리뷰 보강으로 빈 `meetingTool` 저장 차단, UUID 검증, 프리셋 테이블 미적용 424 안내, 교차 회사 삭제 404 응답, 프리셋 목록 전환 초기화, 삭제 확인창, 비율 소수 입력 유지를 추가했다. UI는 `분석표 프리셋` 툴바로 분리해 목표매출 입력의 하위 옵션처럼 보이지 않게 정리했다. 2차 고도화로 PDF/인쇄 출력물을 목표매출 1~3차 비교표와 미팅 자료형 레이아웃으로 정리하고, 후보지별 `리포트 버전 이력` 저장/불러오기와 `상권분석·목표매출 근거` 섹션을 추가했다. 후보지 주소/좌표 기반 Kakao 상권 지도와 300m/500m/1km 반경 설정을 추가했고, 지도에는 확대/축소, 일반/스카이뷰/지적편집도 전환, 거리재기, 면적재기 도구를 제공한다. 측정 점은 후보지 `meetingTool.marketMap`에 저장되어 저장/버전/출력 후에도 유지되며, PDF/인쇄 출력물은 지도 타일, 마커, 반경 원, 측정 선·면·점만 표시하고 별도 좌표 기준 박스는 출력하지 않는다. 후속 코드리뷰로 미팅 도구 도메인 로직과 CSS를 컴포넌트 전용 모듈로 분리해 유지보수 리스크를 낮췄다.
- 업체 계약함/업체 관리: 프랜차이즈 메뉴에 `/contracts/vendor` 업체 계약함과 `/dashboard/franchise-vendors` 업체 관리를 추가했다. 업체 계약함은 물류, 식자재, 인테리어, 마케팅, 임대차, 기타 계약을 회사 범위로 등록하고, 기존 전자계약 문서 연결 또는 파일 업로드 문서 보관을 지원한다. 업로드 문서는 `property-documents/franchise-vendor-contracts/<company>/<contract>/...` 경로에 저장하고 signed URL로 열람한다. 계약 만료 D-30/D-7 알림은 기존 프랜차이즈 인앱 알림에 연동하며, 수신자는 계약 담당자와 회사 팀장이다. 2차-2A로 만료 업무 큐, 계약 상세 패널, 갱신/종료 처리, 처리 이력 테이블을 추가했다. 갱신은 원본 계약을 `갱신완료`로 닫고 새 `진행중` 계약을 복사 생성하며, 종료는 사유와 함께 `해지` 상태로 기록한다. 업체 관리는 `franchise_vendors` 업체 마스터를 직접 등록/수정하고, 계약함에서 업체 마스터를 선택한 계약은 `vendor_id` 기준으로 우선 병합한다. 기존 직접입력 계약은 업체명 fallback으로 병합해 업체별 계약 수, 진행/관리 필요 건수, 다음 만료 계약, 최근 메모를 보여준다. `업체 생성` 버튼은 업체 목록 섹션 안에서 폼을 열며, 계약함의 `업체 선택`은 업체 관리 마스터를 불러와 구분/업체명을 자동 입력한다. 업체 계약함 목록 화면은 검색/큐/계약 목록과 `계약 등록` 버튼 중심으로 정리했고, 신규 등록과 수정은 `/contracts/vendor/register` 전용 페이지에서 처리한다. 계약 상세는 행 선택 시 목록 아래에 열린다. 증거 묶음 PDF 출력은 이번 범위에서 제외했다.
- 가맹 운영 슈퍼바이징: `/dashboard/franchise-operations` 가맹 운영 탭을 `대시보드 / 슈퍼바이징 / 가맹점 목록 / 가맹점 등록`으로 확장했다. 슈퍼바이징 탭은 오늘/이번주 방문, 미제출 보고서, 승인 대기, 시정요청 진행 요약과 SV 배정, 방문 점검 일정, 점검 보고서 저장/제출, 관리자 승인/반려, 시정요청 상태 변경을 제공한다. `admin`/`manager`는 회사 전체를 관리하고, 일반 직원/SV는 본인 관련 배정·방문·보고서 중심으로 조회/작성한다. 2026-07-03 2차 고도화로 내부 탭을 `운영 리포트 / 배정 관리 / 방문 일정 / 점검 보고서 / 승인·시정요청`으로 정리했고, KPI 클릭 필터, 회사 점검 템플릿 저장/적용, 보고서/시정요청 이력, 보고서 PDF/인쇄, 내부 알림톡 훅을 추가했다. 당시 점포개발·전사 업무용 `schedules` 동기화 파일럿은 2단계에서 `franchise_schedules`와 `/dashboard/franchise-operations/schedule` 전용 연결로 대체했다. 과거 파일럿 행의 이관·종료는 후속 운영 고도화 항목이다. 운영 리포트는 팀장/관리자에게 회사 전체 현황, SV에게 내 담당 운영점 현황으로 보이게 문구를 분기했고, `배정 관리`는 팀장/관리자에게만 노출한다. 방문 일정은 목록 우선 UI로 바꾸고 검색/SV/상태 필터, 페이지네이션, 수정/삭제를 제공하며, 등록/수정 폼은 SV 선택 후 해당 SV에게 배정된 운영점만 표시한다. 삭제는 이력 보존을 위해 방문을 `취소` 처리한다. `오늘 처리 큐`는 `운영 우선순위`로 정리했다. 배정 관리는 담당지역 입력을 제거하고 운영점별/SV별 목록, SV·배정상태·검색 필터, 페이지네이션, 선택 행 하단 인라인 배정/수정 편집 흐름으로 정리했다. 점검 보고서 탭은 `보고서 목록`과 `보고서 작성`을 분리해 방문별 보고서 상태, 개선필요 수, 사진 수, 특이사항을 먼저 비교하고 선택 항목만 작성/수정한다. AI 회의록 정리는 서버 NVIDIA NIM 호출 결과를 바로 반영하지 않고, 요약/특이사항/항목별 판정/메모/원문 근거를 검토한 뒤 항목별 적용 또는 제외할 수 있으며 문체·근거·후속조치 품질 경고를 보여준다. 2026-07-07 보정으로 AI가 출처 접두어를 항목마다 반복하지 않게 하고, PDF/인쇄의 `조치 필요 항목`은 상태와 항목명 요약만 보여주며 상세 메모는 `전체 점검 내역` 표에만 남긴다. 승인·시정요청 탭은 `승인 대기`, `승인 완료 보관함`, `반려 보고서` 세션으로 분리하고, 전체 처리 이력 대신 `보고서 확인` 상세 안에서 해당 보고서의 처리 이력만 확인한다. 시정요청 목록은 별도로 유지한다. 코드리뷰 보정으로 상태 전환/회사 범위 검증/RLS/첨부 URL 신뢰 경계를 강화했다. 신규 `supabase_franchise_supervision_v2_migration.sql` 적용이 필요하다. **SQL 등록 필요**.
- 공통 일정/결재 MVP: `/schedule`의 기존 점포개발 업무용 달력/작업내역/일정내역 화면은 `점포개발 일정` 탭에 그대로 두고, 새 `전사 업무·결재` 탭에 `오늘 처리`, `승인 대기`, `지연 업무`, `이번주 일정` KPI와 업무 큐를 추가했다. 신규 `/api/franchise-approvals/templates`, `/api/franchise-approvals/documents`, `/api/franchise-approvals/actions`는 회사 범위 결재 양식/문서/상태 전이를 처리한다. `schedules`는 점포개발·전사 결재 업무 허브이며 가맹운영 원천 일정 저장소로 사용하지 않는다. 초기 파일럿의 SV 방문·보고서 연결은 2단계 완료 계약에서 제외했고, 현재 SV 원천 일정은 `franchise_schedules`와 `/dashboard/franchise-operations/schedule`를 사용한다. 보고서 결재 알림과 `approval-document` 일정은 전사 결재 범위로 유지한다. `supabase_franchise_approval_calendar_migration.sql`은 2026-07-10 운영 DB 적용 완료다. **SQL 등록 완료 확인**.
- 코드리뷰 보정: 결재 알림 딥링크는 전사 업무·결재 탭으로 바로 이동해 해당 결재 일정을 강조한다. 결재 source ID는 서버 생성으로 제한하고, 원천 연결 문서는 내부 연동 전용으로 막았으며, 승인/반려와 결재자 지정은 관리자/팀장 범위로 제한했다. 작성자와 결재자는 분리했고, `approval-document` 일정은 일정 API의 직접 수정/삭제/완료로 숨길 수 없다. source-linked 일정 일반 편집은 관리자/팀장으로 제한하고, 슈퍼바이징 workflow sync 실패는 기존 보고서/방문 저장을 막지 않는다. 결재 문서/이벤트 직접 쓰기 RLS는 서버 API 경유만 허용하도록 닫았다.
- 가맹 운영 인력 세팅: `/dashboard/franchise-operations` 가맹 운영 탭을 `대시보드 / 슈퍼바이징 / 인력 세팅 / 가맹점 목록 / 가맹점 등록`으로 확장했다. 인력 세팅 탭은 운영점 선택, 월 목표매출, 영업일/영업시간, 목표 인건비율, 급여 기준을 입력해 점장/직원/알바 권장 인원과 월 인건비, 매출 대비 인건비율, 주간 근무표를 계산한다. 입력 화면은 `빠른 계산`과 `상세 조건`으로 분리했고, 상세 조건에서 점주/본인 근무 포함, 기본 브레이크타임 15:00-17:00, 급여 기준을 조정한다. 결과는 `보수형 / 표준형 / 공격형` 시나리오 비교와 시간축 근무표로 확인한다. 1차는 임시 계산과 운영점별 인력 세팅안 저장/불러오기, 급여/3.3%/일당 부속 계산기, 노무 서식함의 전자계약 진입점까지 포함한다. 최저시급, 보험률, 원천징수율, 연장/야간/휴일 배수는 회사·연도별 설정값과 저장 시점 스냅샷을 사용하며, 결과는 운영 예산 산정용 참고값으로 안내한다. 저장/이력용 신규 `supabase_franchise_labor_planning_migration.sql` 적용이 필요하다. **SQL 등록 필요**.
- 점주 포털 1차: 기존 본사 `/login`과 `profiles` 직원 권한 체계에 섞지 않고 `/owner/login`, `/owner/dashboard`를 별도 공개 라우트로 추가했다. 본사는 `가맹 운영 > 점주 소통`에서 공지/공문, 점주용 운영 체크리스트, 제출 처리, 점주 계정 설정을 관리한다. 점주 계정은 회사별로 발급하며, 본사 화면은 `점주 계정 설정`에서 `/owner/login/{companyId}` 형태의 회사별 점주 포털 단축 링크를 제공한다. 점주는 전용 링크에서 회사명 입력 없이 `아이디 + 비밀번호`로 로그인해 전용 HttpOnly 세션으로 자기 운영점 하나만 접근한다. 기존 `?companyId=` 링크는 호환용으로 유지한다. 점주 화면은 내 매장 기본 정보 제출, 공지 읽음 처리, 운영 체크리스트 완료 요청, 시설/고장 문의, 최근 제출 이력을 제공한다. 운영 체크리스트는 공지처럼 `체크리스트 발송` 화면에서 전체 가맹점 또는 선택 운영점에 발행하고, 발송 건별 상세에서 완료/미완료 운영점을 확인한다. 2026-07-09 추가 보정으로 점주 포털의 운영 체크리스트 기본 화면도 공지/공문처럼 발송 1건 목록 카드와 `총 1건` 페이지 바 형태로 정리했고, 6개 세부 항목은 `항목별 완료 요청 보기`를 펼쳤을 때만 표시한다. 본사 `발송 현황` 상세는 가맹점별 완료 요청 상태를 한 줄에 여러 가맹점이 보이는 그리드로 표시한다. 체크리스트 완료 요청은 일반 제출 처리의 승인/반려 대상이 아니라 발송 현황 집계로 관리한다. 운영 체크리스트는 `franchise_locations.data.ownerPortalChecklist`에 저장하며 기존 오픈 준비 프로젝트 체크리스트와 분리한다. 신규 `supabase_franchise_owner_portal_migration.sql`과 기존 적용 DB용 `supabase_franchise_owner_company_login_scope.sql` 적용이 필요하다. **SQL 등록 필요**.
- 점주 공지/공문 첨부: 본사 `가맹 운영 > 점주 소통 > 공지/공문`에서 이미지/PDF/문서 파일을 첨부해 발행하고, 점주 `/owner/notices`에서 파일명과 용량을 확인한 뒤 다운로드할 수 있게 반영했다. 공지 첨부 메타데이터는 `franchise_owner_notices.attachments` JSON에 저장하며 기존 적용 DB에는 `supabase_franchise_owner_notice_attachments_migration.sql` 추가 적용이 필요하다. SQL 미적용 환경에서는 기존 공지 목록과 점주 포털 대시보드 조회는 첨부 없이 fallback하고, 첨부 업로드만 SQL 적용 안내로 차단한다. **SQL 등록 필요**.
- 이전 운영 기준 배포 기록: 직원 관리/개인정보 수정 보강부터 점주 체크리스트 공지형 목록 재보정까지 포함한 `dpl_3DPHWePbgCxnneVpWKbx1nV4DvBu`에서 Vercel inspect `name=naeilsajang`, `target=production`, `status=Ready`, aliases `https://www.fcerp.co.kr`, `https://fcerp.co.kr`를 확인했다. 현재 릴리즈 기준은 위 2026-07-10 항목을 따른다.
- 신규 SQL: 회사 공용 수익분석표 프리셋용 `supabase_franchise_location_meeting_tool_presets_migration.sql`과 후보지별 리포트 버전 이력용 `supabase_franchise_location_meeting_tool_versions_migration.sql`은 사용자 확인 기준 실서버 등록 완료.
- 신규 SQL: 업체 계약함용 `supabase_franchise_vendor_contracts_migration.sql`은 업체 마스터 연동용 `vendor_id` 컬럼/인덱스/FK를 추가하도록 보강했다. 사용자 확인 기준 `supabase_franchise_vendors_migration.sql`, 보강된 `supabase_franchise_vendor_contracts_migration.sql`, 업체 계약 갱신/종료 이력용 `supabase_franchise_vendor_contract_events_migration.sql`은 Supabase SQL Editor 등록 완료.
- 신규 SQL: 알림톡 운영 관리용 `supabase_franchise_alimtalk_operations_migration.sql`을 추가했다. 이 SQL은 `alimtalk_templates`, `alimtalk_scenarios`, `alimtalk_company_settings`, `alimtalk_send_logs`와 6개 기본 템플릿/시나리오 seed를 포함한다. 대상 Supabase 환경에는 사용자가 직접 SQL을 등록해야 한다.
- 신규 SQL: 점주 포털 알림톡 3종 seed용 `supabase_franchise_owner_portal_alimtalk_templates_migration.sql`을 추가했다. 이 SQL은 승인된 점주 공지/공문, 시설/고장 문의 접수, 점주 포털 계정 발급 템플릿과 시나리오를 기존 `alimtalk_templates`/`alimtalk_scenarios`에 등록한다. 사용자 확인 기준 SQL 등록은 완료했으며, `/admin/alimtalk`에서 SOLAPI template ID와 Kakao channel ID를 저장해야 실제 발송된다. **SQL 등록 완료 확인**.
- 신규 SQL: 가맹 운영 슈퍼바이징용 `supabase_franchise_supervision_migration.sql`을 추가했다. 이 SQL은 SV 배정, 방문 일정, 점검 보고서, 시정요청 테이블과 상태 제약/인덱스/RLS를 포함한다. 대상 Supabase 환경에는 사용자가 직접 SQL을 등록해야 한다. **SQL 등록 필요**.
- 신규 SQL: 가맹 운영 슈퍼바이징 2차용 `supabase_franchise_supervision_v2_migration.sql`을 추가했다. 이 SQL은 회사별 점검 템플릿, 보고서 이벤트, 시정요청 이벤트, 보고서 `template_id`, 내부 알림톡 4개 draft 템플릿/시나리오 seed를 포함한다. 대상 Supabase 환경에는 사용자가 직접 SQL을 등록해야 한다. **SQL 등록 필요**.
- 신규 SQL: 공통 일정/결재 MVP용 `supabase_franchise_approval_calendar_migration.sql`을 추가했다. 이 SQL은 기존 `schedules` 확장과 `approval_templates`, `approval_documents`, `approval_document_events` 테이블, source 중복 방지 인덱스, 회사 범위 RLS를 포함한다. 사용자 확인 기준 2026-07-10 운영 DB 적용을 완료했다. **SQL 등록 완료 확인**.
- 신규 SQL: 가맹운영 전용 일정의 공유/개인 구분용 `supabase_franchise_schedule_visibility_migration.sql`을 추가했다. 기존 일정과 자동 생성 일정은 공유로 유지하고, 개인 일정은 생성자 본인만 조회·수정·삭제하도록 컬럼 제약과 RLS를 추가한다. 2026-07-13 전자결재 보안 리뷰에서 비활성 프로필 차단 조건을 추가했으므로 최신 파일 재적용이 필요하다. **SQL 재등록 필요**.
- 신규 SQL: 가맹운영 원천 일정 upsert 보강용 `supabase_franchise_source_schedule_upsert_migration.sql`과 비활성 계정·협력업체 담당자 및 잘못된 관리자 역할을 RPC에서 거부하는 `supabase_franchise_source_schedule_profile_security_migration.sql`은 사용자 확인 기준 대상 DB 적용 완료다. 실행 순서는 `upsert` 다음 `profile security`다. **SQL 등록 완료 확인**.
- 신규 SQL: 가맹 운영 인력 세팅용 `supabase_franchise_labor_planning_migration.sql`을 추가했다. 이 SQL은 회사별 노무 계산 기준, 운영점별 인력 세팅안, 역할별 추천 인력 행을 포함한다. 대상 Supabase 환경에는 사용자가 직접 SQL을 등록해야 한다. **SQL 등록 필요**.
- 신규 SQL: 점주 포털용 `supabase_franchise_owner_portal_migration.sql`을 추가했다. 이 SQL은 점주 계정, 점주 전용 세션, 공지/읽음 기록, 제출 이력, 업로드 파일 메타 테이블과 RLS 정책을 포함한다. 기존 적용 DB는 회사별 점주 로그인 ID 중복 허용을 위해 `supabase_franchise_owner_company_login_scope.sql`도 추가 적용해야 한다. 대상 Supabase 환경에는 사용자가 직접 SQL을 등록해야 한다. **SQL 등록 필요**.
- 신규 SQL: 점주 공지/공문 첨부용 `supabase_franchise_owner_notice_attachments_migration.sql`을 추가했다. 이 SQL은 기존 `franchise_owner_notices`에 `attachments jsonb` 컬럼을 추가한다. 대상 Supabase 환경에는 사용자가 직접 SQL을 등록해야 한다. **SQL 등록 필요**.
- 신규 SQL: 진행현황 확인/수정 첨부 열람 보강은 기존 `properties.data`와 기존 `/api/upload` Storage 경로를 사용하므로 신규 SQL이 없다.
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
- 진행현황 `확인/수정` 모달에서 신규 업로드 이미지 썸네일, PDF/이미지 다운로드, URL 없는 과거 첨부의 `재첨부 필요` 안내, `영업중` 입점요청의 현재 영업중 상호/매장명 저장/재조회가 정상인지 실계정으로 확인한다.
- 공개 페이지 `/landing`, `/login`, `/signup`, `/privacy` 하단의 사업자정보가 운영 도메인에서 노출되고 Kakao 비즈니스 심사 화면에서 동일 정보로 인식되는지 확인한다.
- 물건지 지도는 실서버 Kakao 도메인에서 타일/마커/반경 원/측정 도구를 확인.
- 업체 계약함 SQL 적용 후 실계정으로 업체 계약 신규 등록, 업로드 문서 열람 signed URL, 전자계약 연결, 수정/삭제, D-30/D-7 알림 생성을 확인한다. 이벤트 SQL 적용 후 실계정으로 갱신 처리, 새 계약 생성, 종료/해지 처리, 처리 이력 최신순 표시, 만료 업무 큐 카운트와 필터를 확인한다.
- 알림톡 운영 SQL 적용 후 admin 실계정으로 `/admin/alimtalk`에서 템플릿 상태/ID 저장, 시나리오 ON/OFF 저장, 회사별 월 한도·주의 기준 저장, 발송 로그 빈 상태와 schema-ready 상태를 확인한다.
- 정보공개서 Gmail 발송 폼에서 후보자명을 입력하지 않으면 발송이 차단되는지, 입력 후 알림톡 미리보기의 `#{후보자명}`/`#{브랜드명}` 변수와 실제 `alimtalk_send_logs`의 `disclosure_email_sent` 발송 로그가 맞는지 운영 실계정으로 확인한다. 수령 확인 버튼 클릭 후 `disclosure_confirmed` 로그에 `확인일`/`계약가능일` 변수가 채워지는지, 수령 확인이 없는 발송/열람 추정 건이 내부 `정보공개서 수령 미확인` 큐로 잡히는지도 확인한다. `franchise_contract_eligible` 테스트 데이터로 가맹계약 가능 상태 알림톡의 후보자명, 수령확인일, 계약가능일 표시도 확인한다.
- 슈퍼바이징 SQL 적용 후 실계정으로 `/dashboard/franchise-operations` 슈퍼바이징 탭에서 SV 배정 생성, 방문 일정 생성, 보고서 임시저장/제출, 관리자 승인/반려, `개선필요` 항목의 시정요청 생성과 상태 변경 persistence를 확인한다.
- 슈퍼바이징 v2 SQL 적용 후 실계정으로 KPI 클릭 필터, 회사 점검 템플릿 저장/재조회, 보고서 PDF/인쇄, 보고서 제출/승인/반려 이력, 시정요청 상태 변경 이력, 내부 알림톡 차단/성공 로그를 확인한다. 2단계 원천 연결 구현 후에는 SV 방문·보고서 일정의 생성·수정·취소가 `franchise_schedules`와 `/dashboard/franchise-operations/schedule`에만 반영되고 `schedules`와 `/schedule`에는 나타나지 않는지 확인한다.
- 공통 일정/결재 SQL 적용 후 실계정으로 `/schedule`의 `점포개발 일정` 탭과 `전사 업무·결재` 탭, 전사 결재 알림·승인 대기 일정의 기존 동작을 회귀 확인한다. 이 화면에서 SV 방문 등 가맹운영 원천 일정을 검증하지 않는다.
- 적용된 원천 일정 SQL 기준 실계정으로 업체 계약 만료·갱신·종료와 정보공개서 계약 가능일 변경을 실행해 `franchise_schedules`의 원천별 단일 행, 상태·`completed_at` 보존, `/dashboard/franchise-operations/schedule` 표시, `schedules` 및 `/schedule` 미노출을 확인한다.
- 인력 세팅 SQL 적용 후 실계정으로 `/dashboard/franchise-operations` 인력 세팅 탭에서 월 매출 3,000만/6,000만/1억 이상 샘플 계산, 세팅안 저장/새로고침 persistence, 저장안 불러오기, 주간 근무표와 부속 계산기 기준값 일치를 확인한다.
- 점주 포털 SQL 적용 후 실계정으로 `가맹 운영 > 점주 소통`에서 공지/공문 발행과 읽음 현황, 운영 체크리스트 전체/복수 운영점 발송, 체크리스트별 완료/미완료 운영점 상세, 점주 계정 생성/중지/활성화/재발급, `/owner/login/{companyId}` 전용 링크 로그인, 매장 정보 제출, 공지 읽음, 운영 체크리스트 완료 요청, 시설 문의 등록, 본사 제출 처리/보관 persistence를 확인한다. 점주 포털 알림톡 seed 적용 후에는 공지/공문 발행, 시설/고장 문의 등록/재제출, 점주 계정 신규 발급 시 `alimtalk_send_logs`에 성공/차단/실패 로그가 남는지 실계정으로 확인한다. 로컬 production mock QA에서는 점주 체크리스트 공지형 1건 목록, 본사 발송 현황 9개 가맹점 그리드, 상태 배지 중앙 정렬, desktop/mobile overflow 0과 console error 0을 확인했다.
- 점주 공지/공문 첨부 SQL 적용 후 실계정으로 본사 공지 발행에서 이미지/PDF/문서 첨부 업로드, 읽음 현황 첨부 링크 표시, 점주 `/owner/notices` 다운로드 링크, 공지 삭제 시 점주 포털 미노출과 첨부 Storage 정리를 확인한다.
- 2026-07-07 보안 감사 후속 배포 후 모객 DB에서 Meta 연동과 후보지 연결 패널의 `requesterId is required` 콘솔 오류가 재발하지 않는지 확인한다. 전자계약 템플릿/다운로드 권한은 `sub_manager`가 같은 회사 범위에서 접근 가능한지 확인하고, UCanSign 미연결 계정의 대시보드 진입 시 서버 콘솔에 불필요한 error 로그가 반복되지 않는지 확인한다.
- 보안 감사 SQL 보완: `supabase_platform_audit_required_sql_2026_07_07.sql`은 `share_links.revoked_at`, `system_settings`, 중복 방지 unique index를 포함한다. 사용자 확인 기준 대상 Supabase 환경에 적용 완료했다. **SQL 등록 완료 확인**.

## 주요 문서 역할

- `MAC_CONTEXT.md`: 맥북 worktree, 배포 방식, 새 세션 시작 체크리스트.
- `ERP/web/README.md`: 실행, 환경변수, SQL 적용 순서.
- `ERP/web/docs/release-management.md`: 브랜치, 커밋, dev/main 반영, 배포 ledger.
- `ERP/web/docs/franchise-dev-qa-log.md`: 상세 개발/QA 이력과 미검증 리스크.
- `ERP/web/docs/franchise-growth-roadmap.md`: 제품 방향, API 정책, 다음 작업 목록.
- `ERP/web/docs/documentation-agent.md`: Docs Steward 권한과 문서 갱신 규칙.

## 2026-07-13 전사 전자결재 v2 구현 상태

- 상위 메뉴 `/approvals`에 전자결재 홈, 작성하기, 결재 대기, 내 문서함, 부서 문서함, 양식 관리, 조직·결재 설정을 추가했다.
- 시스템 접근 권한과 조직 직책을 분리했다. 활성 회사 구성원을 이름으로 선택해 부서 소속, 직책, 부서장, 결재 역할, 기간형 위임을 설정하며 제출 시점 조직과 결재선을 문서 버전에 보관한다.
- 순차 결재, 전원 병렬 합의, 그룹 1인 처리, 참조·수신, 반려 사유, 첫 처리 전 회수, 재상신 버전을 지원한다. 현재 단계 대상자만 처리할 수 있고 자기 결재와 교차 회사 접근을 차단한다.
- 작성 화면과 결재 상세는 같은 구조화 필드 renderer를 사용한다. 작성 화면에서 참조자와 수신 부서를 선택할 수 있고 기존 문서를 수정할 때 선택값을 복원한다. 첨부는 전용 비공개 `approval-documents` Storage에 저장하고 권한·보존 기한 확인 후 내려받으며, 상세 화면에서 Noto Sans KR을 포함한 pdfme PDF를 생성한다.
- 결재 단계가 시작되면 실제 대상자에게 인앱 알림과 `approval-document` 일정이 생성된다. 단계 이동 시 대상을 갱신하고 반려·최종 승인·회수·완료 시 일정을 완료한다.
- 기존 단일 결재 API와 문서는 전환 기간 동안 유지한다. migration은 과거 제출·승인·반려 문서를 1단계 version/step 구조로 변환해 새 상세 링크에서도 조회와 처리가 이어지게 한다.
- 신규 SQL: `supabase_company_approvals_v2_migration.sql`. 리뷰 보정으로 슈퍼바이징 보고서와 결재 전이를 한 트랜잭션으로 묶고, 보고서 직접 쓰기 RLS를 닫았으며, 조회도 작성자·담당 SV·같은 회사 관리자 범위로 제한했다. 사진은 전용 비공개 `franchise-supervision-private` 버킷에서만 저장·서명하며 레거시 공용 버킷 메타데이터는 API에서 제외한다. 비활성 계정 및 과도한 관리자 공개 범위 차단까지 포함한 최신 파일 적용을 완료했다. 기존 `property-documents/franchise-supervision/` 객체는 비공개 버킷 대체본 확인 후 Storage API 또는 대시보드에서 삭제한다. **SQL 등록 완료 확인**.
- `supabase_company_approvals_organization_delete_safety_migration.sql` 적용을 완료했다. 조직 삭제 시 구성원 소속과 결재 담당자 연결이 함께 지워지지 않도록 외래 키를 제한 삭제로 전환한다. **SQL 등록 완료 확인**.
- 문서 작성 중 양식의 결재 단계별 실제 결재자와 참조자를 고를 수 있다. 순차 단계는 여러 결재자를 선택하고 순서를 바꿀 수 있으며, 상신 시 선택 순서대로 각각의 실제 결재 단계가 생성된다. 병렬 단계는 전원 또는 1인 처리 규칙을 유지한다. `supabase_company_approvals_document_line_override_migration.sql` 적용을 완료했다. **SQL 등록 완료 확인**.
- 마지막으로 적용하는 `supabase_company_approvals_security_review_migration.sql`은 결재 문서·양식이 참조하는 조직 삭제 차단, 필수 첨부파일의 실제 업로드 검증, 유효기간이 지난 소속 제외, 모든 다중 순차 결재 단계 분리, 재요청 시 중복 결재 진행 방지와 현재 버전·단계 검증을 포함한다. 기존 버전의 idempotent 결재 RPC 실호출은 확인했으며, 후속 보안 리뷰에서 캐시 반환 전 호출자 검증과 만료·해제 위임 접근 차단을 추가했다. 최신 파일은 다시 적용해야 한다. **SQL 재등록 필요**.
- 이어지는 `supabase_company_approvals_workflow_schedule_fix_migration.sql`은 현재 단계에서 아직 응답하지 않은 원 결재자와 대결자만 일정 대상에 남기고, 병렬 결재에서 이미 처리한 사용자의 승인 대기 일정이 계속 보이지 않도록 동기화 함수를 보정한다. **SQL 등록 완료 확인**.
- 첨부파일 선택 영역은 실제 선택 버튼과 드래그 추가, 형식·10MB·최대 5개 검증, 파일명·용량·업로드 대기 상태를 제공한다. 저장 시 전용 비공개 버킷으로 업로드하고 상세 화면에서 권한을 확인한 뒤 내려받는다.

## 2026-07-14 전자결재 1단계 문서함 운영 보강

- 순차 개발 로드맵의 1단계 `전자결재 운영 완성` 구현을 마쳤으며, 문서함 실계정 QA가 남아 현재 단계 상태는 `검증 중`이다.
- 결재 대기, 내 문서함, 부서 문서함의 검색은 현재 페이지 20건만 거르지 않고 회사 전체 접근 가능 문서를 서버에서 검색한 뒤 페이지네이션한다.
- 검색 대상은 제목, 기안자, 소속 부서, 양식명, 문서번호이며 상태와 제출·수정 기간을 함께 적용할 수 있다.
- 필터 변경 직후 이전 요청이 늦게 끝나 최신 결과를 덮지 않도록 최신 요청만 반영한다.
- 신규 SQL은 없다. 기존 전자결재 v2 SQL 적용 순서는 유지한다.

## 2026-07-14 전자결재 1-6 알림·일정 운영 보강

- 결재 단계 일정의 대상 목록을 전체 원 결재자 스냅샷이 아니라 아직 응답하지 않은 원 결재자와 활성 대결자로 다시 계산한다. 원 결재자와 대결자는 같은 회사의 활성 임직원만 일정·알림 대상이 되며 협력업체로 역할이 바뀐 계정은 기존 metadata가 남아 있어도 읽을 수 없다. 병렬 결재에서 처리한 사용자는 다음 동기화부터 승인 대기 일정 접근 대상에서 제외된다.
- 공용 `/schedule`의 결재 일정은 `/approvals/documents/[id]` 상세로 이동한다. 가맹운영 일정은 별도 사용자와 `franchise_schedules` 저장소를 유지하며 전사 결재 일정과 연동하지 않는다.
- 1440px와 390px mock-session production 브라우저 QA에서 공용 일정의 결재 문서 이동, 문서 상세 렌더링, 가로 넘침 0건, console error 0건을 확인했다.
- 방어 보정으로 가맹운영 일정 API와 최신 visibility RLS는 외부 연동 등으로 `approval-document` 행이 존재하더라도 현재 결재 대상과 관리자 외 회사 구성원에게 노출하지 않는다. 제출 당시 metadata 대신 현재 결재 단계와 유효한 위임을 확인하도록 최신 파일을 다시 보강했다. **SQL 재등록 필요**.
- 신규 SQL: 최신 전자결재 보안 리뷰 migration 다음에 `supabase_company_approvals_workflow_schedule_fix_migration.sql` 적용을 완료했다. **SQL 등록 완료 확인**.
- 실계정 운영 QA: 별도 QA 회사와 6개 역할 계정을 생성해 2명 순차 결재, 병렬 전원 합의, 병렬 1인 합의, 대결 승인, 기안자 완료 처리를 브라우저에서 끝까지 처리했다. 모든 문서가 기대 상태로 전이됐고 결재 일정 4건은 완료, 단계 알림은 모두 종료됐으며 일정·알림 중복은 0건이었다. 병렬 결재선 상세는 전체 대상자 이름을 표시하도록 보정했다.
- 자동 검증은 표준 자동 탐색 명령 `npx tsx --test` 전체 716건, TypeScript, lint, production build, `git diff --check`를 통과했다. 이후 실계정 다중 결재·대결 QA도 통과했다.
- 후속 보안 보정: 만료·해제된 대결자는 결재 대기, 문서 상세 액션, 문서/PDF/첨부 다운로드, 전사·가맹운영 일정에서 즉시 제외한다. 문서와 하위 테이블 RLS, 헤더 알림 조회·읽음 처리도 현재 유효한 위임 및 결재 단계만 허용하고 남아 있는 단계 알림은 자동 종료한다. 최신 보안 리뷰, workflow 일정 보정, 가맹운영 일정 visibility SQL을 순서대로 다시 적용해야 한다. **SQL 재등록 필요**.
