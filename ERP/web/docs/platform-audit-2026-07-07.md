# FC ERP 전체 플랫폼 외부 감사 리뷰 (2026-07-07)

- 대상: `ERP/web` (Next.js + Supabase + Vercel), 운영 도메인 https://www.fcerp.co.kr
- 방식: 154개 API 라우트 + 핵심 lib/컴포넌트를 5개 도메인으로 나누어 병렬 감사. Critical/최상위 High는 코드로 직접 재확인(아래 "직접확인" 표기).
- 감사자: Claude Code (외부 감사형, 코드 미수정)

## 구조적 리스크 (핵심)

모든 API 라우트가 **service-role 클라이언트 + `src/lib/api-auth.ts` 인증 패턴**을 사용한다(RLS 우회). 따라서 **인증 헬퍼를 호출하지 않는 순간 곧바로 전사 데이터가 열린다.** 이번 감사의 Critical 대부분이 정확히 이 패턴이다.

방어가 견고한 영역: 정보공개서 토큰(랜덤 32바이트 SHA-256 해시), Meta 웹훅 서명(HMAC + timingSafeEqual), Gmail 토큰 암호화(AES-256-GCM), 업로드 경로 화이트리스트, UCanSign 웹훅 서명·state HMAC 검증.

---

## Critical

### C-1. 대시보드 무인증 데이터 노출 — 비-UUID userId 인증 우회 (직접확인)
- 위치: `src/app/api/dashboard/route.ts:22-45`
- 문제: 라인 24 `if (!isUuid || userId === 'admin')` 분기에서 Bearer 검증 없이 `companyId = requestedCompanyId`로 임의 회사 데이터 조회. UUID 분기에서만 `getRequesterProfile`+`canAccessCompanyScope` 동작.
- 영향: 로그인 없이 `GET /api/dashboard?userId=admin&companyId=<UUID>`로 임의 회사 일정/계약/점포/고객 집계 열람.
- 수정: "비-UUID=슈퍼어드민" 휴리스틱 제거, 모든 분기 `getAuthenticatedRequesterProfile` + `isAdmin` + `canAccessCompanyScope`.
- 검증: 토큰 없이 호출 → 현재 200, 수정 후 401.

### C-2. 업체 계약함 storage 경로 미검증 → service-role 서명 URL로 타 회사 파일 열람 (직접확인)
- 위치: 쓰기 `src/app/api/franchise-vendor-contracts/vendorContractRouteHelpers.ts:143-144`, 읽기 `src/app/api/franchise-vendor-contracts/route.ts:45-58`
- 문제: POST/PATCH가 `storage_bucket`/`storage_path`를 바디 그대로 저장(prefix 검증 없음). `GET ?action=open`이 그 값으로 `createSignedUrl` 실행. 레코드는 회사 스코프지만 경로 문자열은 자유 조작.
- 영향: 회사 A 사용자가 계약 레코드에 `franchise-lead-documents/<회사B>/...` 경로 저장 후 open → 타 회사 정보공개서·리드 서류·슈퍼바이징 사진 열람.
- 수정: 쓰기 시 bucket 고정 + path `franchise-vendor-contracts/${companyId}/` prefix 강제, open에서도 재검증.
- 검증: 타 회사 경로 저장 후 open → 현재 200+signedUrl, 수정 후 400/403.

### C-3. `/api/properties/promoted` 무인증 고객·명함 연락처(PII) 노출
- 위치: `src/app/api/properties/promoted/route.ts:7-29, 48-108`
- 문제: GET에 인증 헬퍼 전무, `companyId` 선택적. 응답에 `name`, `contact: c.mobile`, `budget`, 메모 포함.
- 영향: propertyId만 알면 무인증으로 실명·휴대폰 열람. (데드 엔드포인트 가능성 있으나 배포 시 공격면)
- 수정: `getAuthenticatedRequesterProfile` + `canAccessCompanyResource`, 미사용이면 삭제.

---

## High

### H-1. `/api/categories` 완전 무인증 (읽기/쓰기) (직접확인)
- 위치: `src/app/api/categories/route.ts:4-28, 30-60`
- 문제: GET/POST 인증 전무. POST는 body의 `companyId`·`createdBy` 신뢰.
- 영향: 무인증 타사 카테고리 열람, 위조 createdBy로 무제한 생성(오염/스팸).
- 수정: 인증 + `canAccessCompanyScope`, `createdBy`=서버 `requester.id`.

### H-2. 스케줄 POST — snake_case 필드로 회사/사용자 스코프 우회 (직접확인)
- 위치: `src/app/api/schedules/route.ts:143, 181-194`
- 문제: 라인 143에서 camelCase만 구조분해 → `company_id`/`user_id`(snake)가 `...rest`에 잔류. insert에서 `...rest`가 검증된 값 뒤에 스프레드되어 덮어씀.
- 영향: 인증 사용자가 타 회사/타 사용자 명의 일정 주입(cross-company write). (PUT은 안전)
- 수정: `...rest` 화이트리스트화 또는 `company_id`/`user_id` 재고정.

### H-3. 정보공개서 confirm이 GET으로 상태 변경 → 메일 프리페처 자동 수령확인
- 위치: `src/app/api/franchise-lead-disclosures/confirm/route.ts:43-86`
- 문제: GET 최초 호출 시 즉시 `confirmed_at` 기록 + 알림톡. Safe Links/메일 게이트웨이가 링크 자동 프리페치.
- 영향: 가맹사업법 숙고기간 "수령 확인" 기록 자동 위조, 계약가능일 왜곡.
- 수정: GET은 버튼만 렌더, 기록은 사용자 액션 POST.

### H-4. 회사 템플릿 발송 "성공→DB실패" 복구 로직 부재 → 중복 발송/이중 과금
- 위치: `src/app/api/electronic-contracts/send-company-template/route.ts:279-336` (대조 `send/route.ts:217-231`)
- 문제: UCanSign 발송 성공(포인트 차감) 후 문서ID 추출/update 실패 시 catch가 무조건 `send_failed`. `send/route.ts`의 복구 로직(events에서 문서ID 회수) 없음.
- 영향: 발송됐는데 실패 표시 → 재발송 → 중복 발송 + 포인트 이중 차감.
- 수정: catch에 동일 복구 로직, provider 호출 직후 문서ID를 events에 선기록.

### H-5. 업체 계약 만료 알림 — "D-30/D-7 당일+조회" 종속, 다음날 자동 dismiss
- 위치: `src/lib/franchise-vendor-contract-notifications.ts:84`, `src/app/api/franchise-notifications/route.ts:239-265`, `vercel.json`
- 문제: `remainingDays !== 30 && !== 7` 이면 미생성 + lazy 생성(조회 의존) + sourceId에 남은일수 포함되어 D-29에 stale-dismiss. `disclosure-due`(D-3/D-1)도 동일.
- 영향: 만료 알림이 하루살이 + 조회 의존 → 주말/휴가 겹치면 누락.
- 수정: 범위화(`0<=days<=30`), sourceId에서 남은일수 제거, due형 stale-dismiss 제외, 생성 cron 추가.

### H-6. 알림 수신자 오류 — 계약별 타게팅 없이 회사 전 계약 owner+manager+조회자 발송(알림톡 포함)
- 위치: `src/lib/franchise-vendor-contract-notifications.ts:87-92`, `src/app/api/franchise-notifications/route.ts:181-222`
- 문제: owner add 분기가 no-op(dead code). 실제 수신자는 "manager 전원 + 모든 계약 owner + 비-manager 조회자".
- 영향: 계약 A owner가 B~Z 만료 알림·알림톡 수신, staff 조회 시 전 계약 대상 upsert → 오발송 + 발송량 소진.
- 수정: 계약별 수신자 = manager 집합 ∪ {해당 계약 owner}, 조회자 무조건 추가 제거.

### H-7. 운영 대시보드 manual-promoted 조회 인증 헤더 누락 → 상시 401
- 위치: `src/components/franchise/operations/requests.ts:108-114`
- 문제: 이 fetch만 `getApiAuthHeaders()` 누락. `/api/properties` GET은 bearer 없으면 401.
- 영향: 수동 승격 매물 패널 상시 로드 실패.
- 수정: `const headers = await getApiAuthHeaders();` 추가.

### H-8. 공유 링크 폐기 개념 부재 + 만료 없는 토큰 영구 유효
- 위치: `src/app/api/properties/route.ts:49-63`
- 문제: `expires_at` null이면 무제한, revoke 체크 없음. (PII blocklist 마스킹은 적용)
- 수정: `share_links.revoked_at` 컬럼 + 발급 시 기본 만료 강제.

### H-9. Gmail OAuth 콜백 인증이 브라우저 리다이렉트에서 실패 가능 (추측 — 런타임 확인)
- 위치: `src/app/api/integrations/gmail/callback/route.ts:75`, `src/lib/api-auth.ts:44-56`
- 문제: 콜백은 top-level GET 리다이렉트인데 인증이 Authorization 헤더 bearer 전용(쿠키 세션 미사용) → 항상 `auth_required` 가능성.
- 수정: state.requesterId(+nonce 쿠키) 신뢰 또는 `@supabase/ssr` 쿠키 세션.

### H-10. customers/properties 수정·삭제 정책이 리소스마다 불일치
- 위치: `src/lib/api-auth.ts:155-172`, `customers/route.ts:383,549,586`
- 문제: `canAccessCompanyResource`는 같은 company면 role 무관 read/write/delete 허용(staff가 타 담당자 고객 삭제). work-intake property는 작성자/팀장/admin 제한 → 불일치.
- 수정: 의도면 문서화, 아니면 write용 별도 함수로 staff 타인 삭제 차단.

---

## Medium

### M-1. 슈퍼바이징 `attachmentsOnly` PATCH가 상태검증 우회 → 승인 후 증빙 사진 변조
- 위치: `src/app/api/franchise-supervision/reports/route.ts:147-159`
- 문제: `attachmentsOnly===true`면 상태 전이 검사 없이 `photo_attachments` 전체 교체. `canAccessSupervisorResource`만 통과하면 승인 후에도 SV 본인이 사진 변경 가능, 이벤트 미기록.
- 수정: attachmentsOnly 허용 상태를 임시저장/제출로 제한(승인·반려 후 차단), 변경 이벤트 기록 추가.
- 검증: 승인된 보고서에 `PATCH {attachmentsOnly:true, photoAttachments:[]}` → 현재 200, 수정 후 409.

### M-2. AI summary(NVIDIA) 타임아웃 체인 + `maxDuration` 미설정 + 500에 내부 에러 노출
- 위치: `src/app/api/franchise-supervision/reports/ai-summary/route.ts:35-37, 240`
- 문제: primary+fallback 순차로 최대 2×타임아웃. `maxDuration` 미설정으로 fallback 전에 함수 종료 가능(추측). catch가 `error.message` 그대로 반환해 `NVIDIA_API_KEY...` 등 구성 문구 노출.
- 수정: `maxDuration` 명시 + fallback 예산 축소(primary 18s/fallback 10s), 500 메시지 고정 문구.
- 검증: `NVIDIA_REQUEST_TIMEOUT_MS=45000` + 지연 목킹, 응답 바디에 env 변수명 부재.

### M-3. AI 프롬프트에 현장 메모 원문(개인정보) 마스킹 없이 외부 전송 + rate limit 없음
- 위치: `src/lib/franchise-supervision-ai-summary.ts:436-512`, `ai-summary/route.ts:197-237`
- 문제: transcript(점주 실명·전화·매출)가 그대로 NVIDIA로 전송. 인증만 되면 12,000자 요청 무제한 반복 가능(비용/쿼터 소진).
- 수정: 전화번호/주민번호 패턴 마스킹, 사용자·회사 단위 호출 횟수 제한.
- 검증: 전화번호 포함 transcript 아웃바운드 바디 확인, 연속 호출 시 429.

### M-4. 정보공개서 14일 기준일 불일치 (내부 게이트 vs 고객 안내)
- 위치: 내부 `src/lib/franchise-disclosure-deliveries.ts:118-159`(sent_at+14) vs 안내 `src/lib/alimtalk-event-notifications.ts:69-88`(confirmed_at+14)
- 문제: 계약 가능 판정은 발송일+14일, 알림톡 `계약가능일` 변수는 수령확인일+14일. 안내와 실제 게이트가 다른 근거.
- 수정: 대기 기준일을 법무 확정 "제공일" 정의로 단일화, 두 계산이 동일 필드 참조.
- 검증: 발송 후 며칠 뒤 확인한 케이스에서 in-app 계약가능일과 알림톡 값 비교.

### M-5. 정보공개서 PDF가 만료 없는 public URL (다른 문서함은 5분 signed)
- 위치: `src/lib/upload-file-validation.ts:144-148`, `franchise-lead-disclosures/send-email/route.ts:153`
- 문제: 정보공개서는 `getPublicUrl`로 영구 공개 URL 발급·이메일 삽입. 점주 문서/업체 계약은 5분 signed URL 사용.
- 수정: 만료 긴 signed URL(14~30일) 또는 토큰 뷰어 경유, 정보공개서 prefix만 비공개+signed 분리.
- 검증: 발송 URL을 인증 없이 시크릿 브라우저 접근 가능/만료 파라미터 유무.

### M-6. Gmail 발송 성공 후 DB update 실패 시 'failed' 기록 → eligibility 누락
- 위치: `src/app/api/franchise-lead-disclosures/send-email/route.ts:208-247`
- 문제: 발송 성공 후 상태 update 실패 시 throw→markFailed로 'failed' 기록. eligibility는 'sent'/'recorded'만 카운트 → 실제 발송건이 계약 대기 산정 제외.
- 수정: 발송 성공은 확정 사실이므로 후속 update 실패는 'sent' 유지 + 재시도/경고.
- 검증: update 단계 강제 오류 주입 후 레코드 상태 vs 실제 수신 메일 비교.

### M-7. 오픈 준비 프로젝트 태스크 전체교체 → lost update + 상태전이 무검증
- 위치: `src/app/api/franchise-opening-projects/route.ts:186-192`
- 문제: PUT이 tasks 전체를 통째 대체. 동시 편집 시 나중 요청이 앞 변경 덮어씀(updated_at 비교 없음). 상태전이 값 정규화만, `대기→완료` 직행·롤백 무기록 허용.
- 수정: 단일 태스크 patch API(taskId+patch) 도입 또는 updated_at optimistic lock.
- 검증: 두 세션에서 서로 다른 태스크 거의 동시 완료 → 한쪽 변경 소실 여부.

### M-8. franchise-leads GET summary/search/`limit=all` 전량 로드 → 타임아웃
- 위치: `src/app/api/franchise-leads/route.ts:566-648`
- 문제: 회사 전체 리드를 1,000행 단위 무한 루프로 수집 후 메모리 변환·검색·disclosure summary. 검색어 있으면 limit 무시.
- 수정: summary는 DB 집계 쿼리로 분리, 검색은 DB 필터 + count/페이지네이션 상한.
- 검증: 시드 2만 건에서 `?summary=true` 응답시간 측정.

### M-9. customers/properties GET 대용량 인메모리 재필터
- 위치: `src/app/api/customers/route.ts:176-224` (properties GET 유사)
- 문제: 검색 시 회사 전체 페이징 후 `matchesCustomerSearch`/`JSON.stringify` 인메모리 필터. 서버리스 타임아웃/메모리 위험.
- 수정: DB 측 `dbSearchFilter`로 최대한 좁히고 인메모리 재필터 축소.
- 검증: 대량 고객 데이터에서 검색 응답시간/메모리 측정.

### M-10. properties/batch `Promise.all` 개별 실패 은폐
- 위치: `src/app/api/properties/batch/route.ts:721-728`
- 문제: history/price/contract update를 `Promise.all`로 실행 후 error 미확인. 일부 실패해도 `success:true`.
- 수정: `Promise.allSettled`로 rejected 카운트해 응답 포함.
- 검증: update 실패 유도 시 응답이 여전히 success인지.

### M-11. 완료 계약서 다운로드가 회사 전 직원(역할 무관) 허용
- 위치: `src/lib/electronic-contracts/document-permissions.ts:28-35`, `electronic-contracts/[id]/download/route.ts:55-58`
- 문제: 삭제/취소는 발송자·admin 제한이나 열람·PDF 다운로드는 같은 company_id면 staff/SV도 가능(양도·양수인 PII).
- 수정: 다운로드를 발송자/매니저+로 좁히거나 감사 로그 추가. (회사 공유가 의도면 문서화)
- 검증: 같은 회사 staff 토큰으로 타 매니저 발송 계약 download → 200 여부.

### M-12. 계약 템플릿 원본 PDF가 public 버킷 + 결정적 경로
- 위치: `src/app/api/electronic-contract-templates/[id]/upload/route.ts:17, 79-89`
- 문제: `property-documents`를 public:true로 생성, `getPublicUrl` 저장. 경로 `.../{companyId}/{templateId}/source.pdf`로 결정적. URL 유출 시 무인증 열람.
- 수정: private 버킷 + `createSignedUrl`(단기 TTL) + company scope 검증.
- 검증: 로그인 없이 publicUrl 직접 GET → 200이면 재현.

### M-13. 권리금계약서 발송 경로 서명자 연락처 형식 검증 부재
- 위치: `src/app/api/electronic-contracts/send/route.ts:49-60`, `src/lib/electronic-contracts/premium-rights-contract.ts:79-81`
- 문제: 회사 템플릿 경로는 `validateSignerContact`를 쓰나 권리금 경로는 빈 값만 확인, `contactType`은 `@` 유무만 판별. 잘못된 수신자 발송 가능.
- 수정: 권리금 경로에도 `validateSignerContact` 적용 후 400.
- 검증: `transferor.contact="not-an-email"` 발송 → 400.

### M-14. 슈퍼바이징 사진 publicUrl 반환이 업로드 정책과 모순
- 위치: `src/app/api/franchise-supervision/route.ts:317-320` vs `src/lib/upload-file-validation.ts:144-148`
- 문제: 업로드는 supervisionReport publicUrl 금지인데 GET은 `getPublicUrl` 생성. 버킷 public이면 무인증 접근, private이면 사진 깨짐.
- 수정: 단기 만료 서명 URL로 전환해 두 정책 일치.
- 검증: 반환된 publicUrl을 비로그인 브라우저에서 접근 여부.

### M-15. `/api/notices` GET 무인증 팀 공지 열람
- 위치: `src/app/api/notices/route.ts:14-59`
- 문제: GET 인증 없음. `companyName`만으로 해당 회사 팀 공지 반환(POST는 인증 정상).
- 수정: GET도 `getAuthenticatedRequesterProfile` 후 비관리자는 자기 회사로만 조회.
- 검증: 토큰 없이 `GET /api/notices?companyName=<타사>` → 401.

### M-16. `/api/companies/search` 무인증 전사 회사·팀장 실명 + debug 노출
- 위치: `src/app/api/companies/search/route.ts:141-165`
- 문제: 회사 선택 UI용 공개 성격이나 매니저 실명·env URL·내부 단계 로그(`debug`)까지 노출.
- 수정: 응답에서 `manager_name`/`debug`/`envUrl` 제거, 최소 필드(id,name)만.
- 검증: 응답에 `manager_name`/`debug` 존재 여부 확인.

---

## Low

### L-1. reset-password 401 응답에 tokenPreview 노출
- 위치: `src/app/api/admin/users/reset-password/route.ts:34-42`
- 수정: `debug`/`tokenPreview` 필드 및 DEBUG 콘솔 로그 제거. 검증: 잘못된 토큰 호출 시 body에 tokenPreview 부재.

### L-2. system/settings POST `fs.writeFileSync` (Vercel 읽기전용 FS 실패 추측)
- 위치: `src/app/api/system/settings/route.ts:26-52`
- 수정: 설정을 DB 테이블로 이전하거나 쓰기 실패 명시 처리. 검증: 배포 환경 POST 후 값 반영 여부.

### L-3. `/api/franchise` 무인증 + 설정없음/결과없음 미구분
- 위치: `src/app/api/franchise/route.ts:5-35`
- 수정: `getAuthenticatedRequesterProfile` 게이트(선택), 파일 미존재를 "결과 없음"과 구분. 검증: 무인증 GET 응답.

### L-4. realty import 스키마 오류 시 생성된 property 롤백 없음
- 위치: `src/app/api/realty/import-jobs/route.ts:657, 731-743`
- 수정: 스키마 오류 시 생성 property 정리 또는 트랜잭션화. 검증: 스키마 누락 상태 import 후 고아 property 확인.

### L-5. business-cards batch/sync 부분 실패 시 이력 소실
- 위치: `src/app/api/business-cards/route.ts:828-873`
- 수정: DELETE 후 insert error 확인 및 실패 보고. 검증: insert 실패 유도 시 이력 유실 여부.

### L-6. business-cards/promoted/link가 promotedCustomers를 top-level 컬럼 접근 (추측)
- 위치: `src/app/api/business-cards/promoted/link/route.ts:27-29, 55, 74`
- 수정: `data->promotedCustomers`(JSONB) 기반으로 통일. 검증: SCHEMA에서 properties.promotedCustomers 컬럼 유무 확인.

### L-7. AI fallback 키워드 맵 키 불일치 `etc` vs `other`
- 위치: `src/lib/franchise-supervision-ai-summary.ts:13-22, 354` vs `franchise-supervision.ts:129-138`
- 수정: 키를 `other`로 정정. 검증: fallback이 etc 키워드로 해당 항목에 매핑되는지.

### L-8. `parseNullableDate` invalid 입력에 원문 반환 → date insert 500
- 위치: `src/lib/franchise-opening-project-api.ts:80-85`, `src/app/api/franchise-leads/route.ts:172-176`
- 수정: invalid면 null 반환. 검증: `targetOpenDate:"abc"` POST → 현재 500, 수정 후 null 저장.

### L-9. 정보공개서 open 추적 픽셀 프리페치 오탐 (추정 문구로 완화)
- 위치: `src/app/api/franchise-lead-disclosures/open/route.ts:29-37`
- 수정: 현행 "열람 추정" 문구 유지로 충분, 개선 시 클릭 기반 이벤트 병행.

### L-10. UCanSign 웹훅 시크릿 URL 쿼리 허용
- 위치: `src/lib/electronic-contracts/ucansign-webhook.ts:129-146`
- 수정: `?secret=` 쿼리 수용 제거, 헤더만 허용. 검증: 로그 파이프라인에서 쿼리 시크릿 기록 여부.

### L-11. UCanSign 토큰 만료시각 하드코딩 (29/30분)
- 위치: `src/lib/ucansign/client.ts:21,51`, `src/lib/ucansign/platform-client.ts:16`
- 수정: 응답의 실제 `expiresIn` 사용. 검증: 실제 토큰 TTL 확인 후 비교.

### L-12. 계약 템플릿 관리 권한 파트너벤더 외 전 직급 개방
- 위치: `src/app/api/electronic-contract-templates/templateApi.ts:85-90`
- 수정: 템플릿 변경(업로드·활성화·삭제·연결)을 매니저+로 상향. 검증: staff 토큰으로 템플릿 upload 시도.

### L-13. 중복 생성 race (leads 전화, 알림톡 send-log)
- 위치: `src/app/api/franchise-leads/route.ts:681-711`, `src/lib/alimtalk-send.ts:177`
- 수정: DB unique 제약 + upsert로 보강. 검증: 동일 전화 동시 POST → 중복 리드/발송 여부.

### L-14. users/check-id, find-password 계정 열거
- 위치: `src/app/api/users/check-id/route.ts:57-68`, `src/app/api/find-password/route.ts:26-31`
- 수정: check-id는 profiles 인덱스 조회로 대체(auth `listUsers()` 제거), find-password 메시지 일반화.

### L-15. 다수 500 응답에 error.message 원문 노출
- 위치: `src/app/api/franchise-market-monitoring/route.ts:486`, categories POST, 기타
- 수정: 사용자에겐 고정 문구, 상세는 서버 로그로만. 검증: 오류 유발 시 응답 body 확인.

---

## 추가 테스트가 필요한 시나리오

1. **무인증 접근 회귀 테스트**: dashboard, categories, properties/promoted, notices, companies/search를 토큰 없이 호출하여 401/403 반환 검증(통합 테스트로 상시 방어).
2. **cross-company write 테스트**: schedules POST/PUT에 snake_case company_id/user_id 주입, categories POST에 타사 companyId 주입 → 저장 값이 요청자 회사로 강제되는지.
3. **storage IDOR 테스트**: 업체 계약 PATCH에 타 회사 경로 저장 후 `?action=open` → 400/403.
4. **정보공개서 프리페치 시뮬레이션**: confirm/open 링크를 HEAD/GET 자동 프리페치했을 때 confirmed_at이 세팅되지 않아야 함.
5. **전자계약 발송 부분 실패**: UCanSign 성공+DB실패 목킹 → 중복 발송 방지/상태 복구 확인(send-company-template).
6. **알림 수신자 단위테스트**: owner 다른 계약 다수 + manager로 계약별 수신자 격리, D-30/D-15/D-7 경계값에서 발화/dismiss.
7. **대량 데이터 부하**: franchise-leads(2만건 summary), customers/properties 검색 응답시간·메모리(서버리스 타임아웃).
8. **Gmail 콜백 런타임**: 실제 OAuth 왕복으로 connection active row 생성 여부(H-9 추측 확인).
9. **AI summary 타임아웃/개인정보**: 전화번호 포함 transcript 아웃바운드 확인 + 지연 목킹 시 fallback 동작.

---

## 우선 수정 TOP 5

1. C-1 대시보드 무인증 우회 — "비-UUID=슈퍼어드민" 제거
2. C-2 업체 계약함 storage 경로 IDOR — prefix 검증
3. H-2 스케줄 snake_case 스코프 우회 — `...rest` 화이트리스트
4. H-1 categories 무인증 (+ C-3 properties/promoted)
5. H-3 정보공개서 confirm GET 자동 수령확인 — POST 전환

## SQL 등록 필요

- `share_links.revoked_at` 컬럼 (H-8)
- leads 전화 / 알림톡 send-log unique 제약 (L-13)
- system_settings 파일→테이블 이전 시 신규 테이블 (L-2)
- (DB 아님) 정보공개/계약 due 알림 생성 cron 등록 — vercel.json (H-5)

## 배포 전 체크리스트

- [ ] C-1/C-2/C-3 무인증·IDOR 패치
- [ ] H-1 categories, H-2 schedules, H-3 confirm, H-4 send-company-template, H-7 operations 헤더
- [ ] 무인증 라우트 전수 재확인(notices GET, companies/search debug 필드)
- [ ] 500 응답 error.message 원문 노출 일괄 점검
- [ ] `property-documents` 버킷 public 여부 확인(M-5/M-12/M-14 판정)
- [ ] Vercel 함수 `maxDuration` 확인(M-2)
- [ ] 신규 라우트 리뷰 체크리스트에 "service-role → 반드시 인증 헬퍼 호출" 추가

## 추가 확인 필요 (추측 항목)

- H-9 Gmail 콜백 런타임 인증 성립 여부
- M-2 Vercel 함수 실행 한도(플랜 의존)
- M-14 `property-documents` 버킷 public 여부
- L-6 properties 테이블 `promotedCustomers` top-level 컬럼 유무
