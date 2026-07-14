# Supabase Service-Role Key 노출 대응

## 대응 상태

- 2026-07-14 사용자 확인 기준: 로컬과 배포 환경의 `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`를 새 publishable/secret key로 교체했다.
- 새 환경변수로 재배포한 뒤 주요 기능에 이상이 없음을 확인했다.
- 현재 운영 Supabase 프로젝트의 기존 JWT 기반 `anon`, `service_role` API key를 비활성화했다.
- GitHub Secret scanning 경고 2건은 정확히 `d257166`의 두 Supabase Service Key를 가리켰으며, 키 폐기 확인 후 2026-07-14 `revoked` 사유로 종결했다.
- GitHub Secret scanning과 Push protection은 활성화되어 있다. Non-provider patterns와 validity checks는 비활성 상태다.
- Supabase CLI `2.109.1`을 설치·인증하고 운영 프로젝트 `naeilsajang`의 Management API 로그를 점검했다.
- 접근 로그 점검 결과는 아래 기준으로 `PASS` 처리했다. 과거 이전 대상 프로젝트는 현재 계정 프로젝트 목록에 없고 프로젝트 도메인도 해석되지 않아 삭제된 프로젝트로 판단했다.
- 남은 작업: 별도 유지보수 창에서 Git 이력 정화 실행 여부 최종 승인.

## 접근 로그 점검 결과

- 점검일: 2026-07-14 KST
- 점검 대상: 운영 프로젝트 `naeilsajang`
- 조회 가능 범위: Logs API에서 데이터가 반환된 2026-07-07 이후 구간과 최근 24시간 상세 집계
- 보존 한계: 노출 시작일인 2026-01-06까지 로그가 남아 있지 않아 전체 노출 기간의 악용 여부를 완전히 증명할 수는 없다.
- 최근 24시간 요청은 프로필, 회사, 가맹 알림, 모객 DB, 업체 계약 등 현재 ERP 경로가 대부분이었다.
- 쓰기 요청은 알림 생성, 로그인, 메모·매물·프로필 수정, 알림톡 로그, 정상 Storage 업로드, 점주 공지 생성·삭제 등 제품 동작과 일치했다.
- 대량 삭제, 알 수 없는 테이블에 대한 반복 쓰기, 비정상 관리자 API 폭증은 확인되지 않았다.
- 4xx는 미존재 `custom_categories` 조회 404, 일부 로그인 400, 사용자 확인 403으로 집계됐고 침해 징후로 보지 않았다.
- 접근 국가는 한국과 AWS 서울 리전이 대부분이었고, 싱가포르 AWS의 소량 요청 외 특이 국가 분포는 없었다.
- 결론: 조회 가능한 로그 범위에서 침해를 의심할 중대한 패턴 없음. **PASS**.

## Git 이력 정화 결정

- 조사 결과 노출 커밋 `d257166`은 로컬·원격 refs 49개와 활성 worktree 8개에 걸쳐 있다.
- 키는 이미 폐기되어 더 이상 인증에 사용할 수 없으므로 현재 서비스의 긴급 위험은 차단됐다.
- 지금 전면 재작성하면 `dev`, `main`, 다수 기능 브랜치와 모든 worktree를 강제 동기화해야 하며 진행 중 작업 손실 위험이 크다.
- 따라서 이번 대응 커밋에서는 이력을 재작성하지 않는다. 별도 유지보수 창에서 작업 중인 브랜치를 정리한 뒤 `git filter-repo`, 원격 refs 강제 갱신, fresh clone 전환을 한 번에 수행한다.
- 공개 저장소에 폐기된 문자열이 남는 위험은 수용하되, GitHub 경고는 `revoked`로 보존하여 감사 추적을 유지한다.

## GitHub 보안 설정 확인

- 저장소: `wogus1001/naeilsajangerp` (public)
- Secret scanning: 활성
- Push protection: 활성
- 탐지 경고: Supabase Service Key 2건, 모두 `resolved / revoked`
- `main`: Vercel status check와 승인 1명 PR review가 필수이며 stale review dismiss가 활성화되어 있다.
- `dev`: Vercel status check는 필수지만 PR review 필수 설정은 없다.
- 보완 후보: Non-provider patterns, validity checks, Dependabot security updates 활성화 여부를 저장소 운영 정책으로 결정한다.

## 확인된 사실

- 2026-01-06 커밋 `d257166`의 `ERP/web/scripts/migrate_db.ts`에 두 Supabase 프로젝트의 service-role key가 문자열로 포함됐다.
- 해당 커밋은 현재 `dev`, `main`과 여러 원격 브랜치의 이력에서 도달 가능하다.
- 현재 스크립트는 환경변수를 사용하지만, 파일을 수정한 것만으로 과거 커밋의 키가 폐기되지는 않는다.
- service-role key는 RLS를 우회하므로 두 키 모두 실제 악용 여부와 무관하게 유출된 것으로 간주한다.

이 문서에는 실제 key, token, JWT payload 또는 재발급 값을 기록하지 않는다.

## P0: 즉시 수행

각 프로젝트를 따로 처리하고 완료 시각과 담당자만 사고 기록에 남긴다.

1. Supabase Dashboard `Settings > API Keys`에서 새 secret API key를 프로젝트별로 생성한다.
2. 키 이름은 소비처를 식별할 수 있게 분리한다. 예: `vercel-production`, `vercel-development`, `local-admin-script`.
3. Vercel Production, Development, Preview와 로컬 비밀 저장소의 서버 전용 값을 새 키로 교체한다.
4. 재배포 후 로그인, 서버 API, Storage 업로드, webhook/cron, 관리자 작업을 smoke test한다.
5. 애플리케이션 smoke test와 API 로그로 새 key가 정상 동작하는지 확인한다. Dashboard에 key 사용 시각이 제공되는 경우 함께 확인한다.
6. 기존 레거시 `service_role` key를 비활성화한다. 기존 `anon` key까지 함께 중단되는 설정은 영향 범위를 확인한 뒤 진행한다.
7. 오래된 프로젝트가 새 API key를 지원하지 않으면 먼저 publishable/secret API key를 활성화한 뒤 같은 절차로 전환한다.

새 secret key도 RLS를 우회한다. 브라우저 코드, `NEXT_PUBLIC_*`, Git, 문서, SQL, 이슈, 채팅에 넣지 않는다.

## 영향 범위 확인

최소 조사 시작 시점은 노출 커밋 시각인 2026-01-06 08:59 KST로 잡는다. 보존 기간이 짧으면 조회 가능한 전체 기간을 조사하고 그 한계를 기록한다.

### Supabase Logs Explorer

- API/edge logs: 평소와 다른 IP, 국가, User-Agent, 시간대, 대량 요청, 2xx/4xx 급증을 확인한다.
- Postgres logs: 대량 select, 예상하지 않은 insert/update/delete, DDL, 권한 변경, 함수 호출을 확인한다.
- Storage logs: 대량 다운로드, 새 객체 업로드, 삭제, 평소 사용하지 않는 bucket 접근을 확인한다.
- Auth logs: 관리자 계정 생성, 초대, 비밀번호/이메일 변경, 비정상 로그인 패턴을 확인한다.
- Edge Function logs: 비정상 호출량과 예상하지 않은 payload/실패 반복을 확인한다.

service-role 요청은 일반 사용자 JWT처럼 행위자를 식별하기 어려울 수 있다. IP, User-Agent, 경로, 응답 상태, 시간대와 Vercel/cron/webhook 로그를 교차 비교한다.

### Platform audit logs

- 조직 구성원 추가/삭제, API key와 프로젝트 설정 변경, Edge Function 배포, 로그 설정 변경을 확인한다.
- Platform Audit Logs는 플랜에 따라 제공 범위와 보존 기간이 다르므로, 사용할 수 없다면 그 사실을 기록한다.

### 애플리케이션과 외부 서비스

- Vercel deployment/function logs에서 Supabase 오류, 비정상 트래픽, 환경변수 변경 주체와 시각을 확인한다.
- GitHub의 clone/fork, Actions, deploy key, personal access token, 비정상 계정 활동을 확인한다.
- 키가 복사됐을 수 있는 CI, 로컬 shell history, 공유 문서, 메신저, 백업을 점검하고 발견 시 함께 폐기한다.

## 조사 결과 기록

보안 기록은 비공개 저장소에 아래 항목만 남긴다.

- 사고 ID, 발견 시각, 대응 담당자
- 영향 프로젝트 ref와 환경(dev/production)
- 노출 커밋과 파일 경로
- 이전 키 비활성화 시각, 새 키 적용/재배포 시각
- 조사한 로그 종류와 조회 가능 기간
- 의심 이벤트의 시각, IP, 경로, 조치 결과
- 데이터 조회·변경·삭제 가능성 및 근거
- 사용자/고객 통지 또는 추가 법률 검토 필요 여부
- 미확인 항목과 책임자, 완료 예정일

실제 키 값, 전체 Authorization header, 개인정보 원문은 기록하지 않는다.

## Git 이력 정화

키 폐기와 환경 교체가 먼저다. 이력 정화는 이미 유출된 키를 안전하게 만들지 못하지만, 재노출 가능성을 줄인다.

1. 모든 작업 브랜치의 미반영 변경과 열린 PR을 확인한다.
2. `git filter-repo`로 확인된 두 문자열을 모든 refs에서 치환하는 별도 작업 계획을 만든다.
3. 정화 전 repository mirror와 필요한 tag를 접근 제한된 위치에 백업한다.
4. `dev`, `main`, 관련 원격 브랜치와 tag를 force-push한다.
5. GitHub PR cache, Actions artifact, release asset, fork에 잔존하는지 확인한다.
6. 모든 작업자에게 기존 clone/worktree 폐기와 fresh clone을 안내한다.
7. 정화 후 secret scanner로 전체 이력을 다시 검사한다.

여러 worktree와 배포 브랜치가 사용 중이므로 이력 재작성은 일반 기능 커밋과 섞지 않고 별도 유지보수 창에서 진행한다.

## 재발 방지

- 서버 비밀은 프로젝트별, 환경별, 소비처별 `sb_secret_...` key를 사용한다.
- migration/seed script도 `process.env`만 사용하고 값이 없으면 즉시 종료한다.
- GitHub secret scanning과 push protection을 활성화한다.
- CI에서 전체 변경분에 secret scanner를 실행하고 탐지 시 병합을 차단한다.
- 배포 전 staged diff와 Vercel dry-run 업로드 목록에서 `.env*`, credential, dump, backup 파일을 확인한다.
- 90일마다 key inventory, last-used, 미사용 key 삭제 여부를 검토한다.

## 완료 기준

- [x] 현재 운영 프로젝트를 새 publishable/secret key로 교체했고, 과거 이전 프로젝트는 삭제 상태임을 확인했다. (2026-07-14)
- [x] 확인된 Vercel과 로컬 소비처가 새 key를 사용한다. (2026-07-14 사용자 확인)
- [x] 이전 JWT 기반 `anon`, `service_role` key가 비활성화됐다. (2026-07-14 사용자 확인)
- [x] 재배포 후 주요 기능 smoke test에서 이상이 없었다. (2026-07-14 사용자 확인)
- [x] 조회 가능한 Supabase 로그 기간을 검토하고 보존 한계를 기록했다. (2026-07-14, PASS)
- [x] 조회 가능한 범위에서 의심 행위 영향 평가를 완료했다. (2026-07-14, 중대 특이사항 없음)
- [x] Git 이력은 즉시 재작성하지 않고 별도 유지보수 창에서 재검토하기로 결정했다. (2026-07-14)
- [x] GitHub secret scanning과 push protection 활성 상태를 확인했다. (2026-07-14)

## 공식 참고자료

- [Supabase: Migrating to publishable and secret API keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)
- [Supabase: JWT Signing Keys](https://supabase.com/docs/guides/auth/signing-keys)
- [Supabase: Logging](https://supabase.com/docs/guides/telemetry/logs)
- [Supabase: Platform Audit Logs](https://supabase.com/docs/guides/security/platform-audit-logs)
