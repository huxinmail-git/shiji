import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { Analytics } from "@/components/analytics";
import { getBaiduTrackingId } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "太史书 · 史记阅读器",
  description: "可探索人物与地理的史记阅读器",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <Analytics baiduTrackingId={getBaiduTrackingId()} />
        {children}
      </body>
    </html>
  );
}
