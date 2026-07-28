import Link from "next/link";
import { PrivacyControls } from "@/components/analytics";
import { getBaiduTrackingId } from "@/lib/site-config";

export const dynamic = "force-static";

export default function PrivacyPage() {
  const baiduTrackingId = getBaiduTrackingId();

  return (
    <main className="privacy-page">
      <section className="privacy-banner">
        <p className="privacy-eyebrow">隐私与统计</p>
        <h1>访问统计和推广位说明</h1>
        <p>
          这个站点会在你明确同意后，才加载百度统计脚本；同时会尊重浏览器的 Do Not Track 和 Global Privacy Control 设置。
          章末推广位只有在环境变量完整配置后才会显示，不会占用空白位置。
        </p>
      </section>

      <section className="privacy-panel">
        <h2>当前授权</h2>
        <PrivacyControls />
      </section>

      <section className="privacy-panel">
        <h2>接入范围</h2>
        <p>当前统计仅用于记录页面访问、章节浏览、人物/地名详情查看和推广点击。访问次数会在顶部独立展示，后续接入国内广告平台时，会继续沿用同样的授权边界和独立适配层。</p>
        <p>站点代码：{baiduTrackingId ? "已配置" : "未配置"}</p>
        <p>
          <Link href="/">返回阅读页</Link>
        </p>
      </section>
    </main>
  );
}
