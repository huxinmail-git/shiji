import type { Metadata } from "next";
import Link from "next/link";
import { PrivacyControls } from "@/components/analytics";
import { getBaiduTrackingId } from "@/lib/site-config";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "隐私与统计说明",
  description: "太史书的访问统计、访客计数和推广位说明。",
};

const copy = {
  eyebrow: "隐私与统计",
  title: "访问统计和推广位说明",
  intro: "这个站点会在你明确同意后，才加载百度统计等运营脚本；访问次数使用独立计数服务展示，不用于识别个人身份。章末推广位只有在环境变量完整配置后才会显示。",
  current: "当前授权",
  scope: "接入范围",
  scopeText: "当前统计仅用于记录页面访问、章节浏览、人物/地名详情查看和推广点击。后续接入 Google Ads 或 Microsoft Ads 时，会将转化跟踪与普通访问计数分开处理。",
  configured: "已配置",
  missing: "未配置",
  siteCode: "站点代码：",
  back: "返回阅读页",
};

export default function PrivacyPage() {
  const baiduTrackingId = getBaiduTrackingId();

  return (
    <main className="privacy-page">
      <section className="privacy-banner">
        <p className="privacy-eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p>{copy.intro}</p>
      </section>

      <section className="privacy-panel">
        <h2>{copy.current}</h2>
        <PrivacyControls />
      </section>

      <section className="privacy-panel">
        <h2>{copy.scope}</h2>
        <p>{copy.scopeText}</p>
        <p>{copy.siteCode}{baiduTrackingId ? copy.configured : copy.missing}</p>
        <p>
          <Link href="/">{copy.back}</Link>
        </p>
      </section>
    </main>
  );
}
