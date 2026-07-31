import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { Analytics } from "@/components/analytics";
import { getBaiduTrackingId, getBingSiteVerification, getGoogleSiteVerification, getGoogleTagId, getMicrosoftUetTagId, getSiteUrl } from "@/lib/site-config";
import { SEO_KEYWORDS, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/lib/seo";

const siteUrl = getSiteUrl();
const googleVerification = getGoogleSiteVerification();
const bingVerification = getBingSiteVerification();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE_TITLE,
    template: "%s \u00b7 " + SITE_NAME,
  },
  description: SITE_DESCRIPTION,
  keywords: SEO_KEYWORDS,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    ...(googleVerification ? { google: googleVerification } : {}),
    ...(bingVerification ? { other: { "msvalidate.01": bingVerification } } : {}),
  },
};

export const viewport: Viewport = {
  themeColor: "#f7efe3",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <Analytics baiduTrackingId={getBaiduTrackingId()} googleTagId={getGoogleTagId()} microsoftUetTagId={getMicrosoftUetTagId()} />
        {children}
      </body>
    </html>
  );
}
