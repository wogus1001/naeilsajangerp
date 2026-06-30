import type { Metadata } from "next";
import Link from "next/link";
import { BusinessInfoFooter } from "@/components/common/BusinessInfoFooter";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "개인정보처리방침 | FC ERP",
  description:
    "FC ERP의 개인정보 처리 및 Google Gmail API 데이터 사용 정책입니다.",
};

const effectiveDate = "2026년 6월 16일";
const appName = "FC ERP";
const contactEmail = "cs@sajang.app";

const policySections = [
  {
    title: "1. 처리하는 개인정보 항목",
    body: [
      "서비스는 회원 가입, 회사별 ERP 운영, 가맹 희망자 관리, 정보공개서 발송 기능 제공을 위해 필요한 범위의 개인정보를 처리합니다.",
      "계정 정보: 이름, 이메일, 연락처, 소속 회사, 직급 또는 권한, 로그인 및 이용 기록",
      "가맹 운영 정보: 가맹 희망자 이름, 연락처, 이메일, 상담 상태, 유입 경로, 담당자, 상담 메모, 출점 후보지 연결 기록",
      "문서 및 발송 정보: 회사별 정보공개서 문서명, 버전, 발행일, 수신 이메일, 발송 시각, Gmail 메시지 ID, 수령 확인 시각, 열람 추정 시각, 발송 오류 기록",
    ],
  },
  {
    title: "2. 개인정보 처리 목적",
    body: [
      "회원 식별, 회사별 접근 권한 관리, 가맹 희망자 상담 및 계약 준비 업무, 정보공개서 발송 이력 관리, 서비스 보안과 오류 대응을 위해 개인정보를 사용합니다.",
      "정보공개서 발송 기록은 가맹사업법상 14일 숙려기간 확인과 내부 감사 기록을 위해 사용됩니다.",
    ],
  },
  {
    title: "3. Google Gmail API 데이터 사용",
    body: [
      "서비스는 담당자가 직접 연결한 Gmail 계정에서 고객에게 정보공개서를 발송하기 위해 Google Gmail API의 gmail.send 범위만 요청합니다.",
      "서비스는 Gmail 편지함을 읽거나 검색하지 않으며, 메일을 수정, 삭제, 보관, 라벨링하거나 연락처 정보를 가져오지 않습니다.",
      "Gmail 연결 시 액세스 토큰과 갱신 토큰은 암호화하여 저장하며, 토큰 만료 시 발송 기능을 유지하기 위한 목적으로만 사용합니다.",
      "Google 사용자 데이터는 정보공개서 이메일 발송과 발송 결과 기록에만 사용하며, 광고, 마케팅, 판매, 제3자 제공, AI 모델 학습 목적으로 사용하지 않습니다.",
    ],
  },
  {
    title: "4. 보유 및 이용 기간",
    body: [
      "계정 정보는 회원 탈퇴 또는 회사 이용계약 종료 시까지 보관합니다. 법령상 보관 의무가 있거나 분쟁 대응이 필요한 기록은 해당 기간 동안 보관할 수 있습니다.",
      "Gmail 연결 정보는 사용자가 연결을 해제하거나 회사 관리자가 계정을 비활성화하면 발송에 사용할 수 없도록 처리합니다.",
      "정보공개서 발송 이력은 법적 숙려기간, 계약 감사, 고객 문의 대응을 위해 필요한 기간 동안 보관합니다.",
    ],
  },
  {
    title: "5. 개인정보의 제3자 제공 및 처리 위탁",
    body: [
      "서비스는 이용자의 개인정보를 판매하지 않습니다. 다만 서비스 제공을 위해 클라우드 호스팅, 데이터베이스, 인증, 이메일 발송 등 필요한 범위에서 외부 서비스 제공자를 사용할 수 있습니다.",
      "정보공개서 이메일은 담당자가 연결한 Gmail 계정을 통해 지정된 수신자에게 발송되며, 이 과정에서 Google의 인프라가 사용됩니다.",
      "법령에 따른 요청이 있거나 이용자가 동의한 경우를 제외하고 개인정보를 별도 목적으로 제3자에게 제공하지 않습니다.",
    ],
  },
  {
    title: "6. 개인정보 파기",
    body: [
      "보유 기간이 끝나거나 처리 목적이 달성된 개인정보는 복구하기 어려운 방식으로 파기합니다.",
      "전자 파일은 안전한 삭제 절차로 파기하고, 출력물은 분쇄 또는 이에 준하는 방식으로 파기합니다.",
    ],
  },
  {
    title: "7. 이용자의 권리",
    body: [
      "이용자는 본인의 개인정보 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다.",
      "Gmail 연동은 서비스 내 연결 해제 기능을 통해 언제든 해제할 수 있으며, 해제 후에는 해당 Gmail 계정으로 새 발송을 진행하지 않습니다.",
      "권리 행사는 아래 개인정보 문의처로 요청할 수 있습니다.",
    ],
  },
  {
    title: "8. 안전성 확보 조치",
    body: [
      "서비스는 회사별 접근 권한을 분리하고, 주요 발송 기록과 토큰 접근을 제한합니다.",
      "Gmail 토큰은 별도 암호화 키로 암호화하여 저장하고, HTTPS 기반 통신을 사용합니다.",
      "관리자와 담당자 권한을 구분하여 개인정보 접근 범위를 업무상 필요한 수준으로 제한합니다.",
    ],
  },
  {
    title: "9. 개인정보 보호 문의",
    body: [
      `개인정보 처리와 Google Gmail API 데이터 사용에 대한 문의는 ${contactEmail}로 연락해 주세요.`,
      "문의가 접수되면 서비스 운영자는 사실 확인 후 필요한 조치를 안내합니다.",
    ],
  },
  {
    title: "10. 방침 변경",
    body: [
      "이 개인정보처리방침은 관련 법령, 서비스 기능, Google API 사용 방식 변경에 따라 개정될 수 있습니다.",
      "중요한 변경이 있는 경우 서비스 화면 또는 별도 안내를 통해 고지합니다.",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Privacy Policy</p>
            <h1>개인정보처리방침</h1>
            <p className={styles.summary}>
              {appName}은 가맹 운영과 정보공개서 발송에 필요한 개인정보만
              처리하며, Google Gmail API 데이터는 사용자가 승인한 이메일 발송
              기능에만 사용합니다.
            </p>
          </div>
          <div className={styles.metaBox}>
            <span>시행일</span>
            <strong>{effectiveDate}</strong>
          </div>
        </header>

        <section className={styles.notice} aria-labelledby="google-api-policy">
          <div>
            <p className={styles.badge}>Google API 사용 고지</p>
            <h2 id="google-api-policy">Gmail 발송 범위 제한</h2>
          </div>
          <p>
            서비스는 정보공개서 발송을 위해 <code>gmail.send</code> 범위만
            사용합니다. 사용자의 Gmail 수신함, 기존 메일 내용, 연락처, 파일을
            읽거나 수집하지 않습니다.
          </p>
        </section>

        <div className={styles.content}>
          {policySections.map((section) => (
            <section className={styles.section} key={section.title}>
              <h2>{section.title}</h2>
              <div className={styles.paragraphs}>
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className={styles.footer}>
          <div className={styles.footerTop}>
            <Link href="/login">로그인으로 돌아가기</Link>
            <span>{contactEmail}</span>
          </div>
          <BusinessInfoFooter className={styles.businessInfo} />
        </footer>
      </div>
    </main>
  );
}
