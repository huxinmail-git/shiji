"use client";

import { useEffect, useMemo, useState } from "react";

const CONSENT_KEY = "shiji.analytics-consent.v1";
const CONSENT_EVENT = "shiji:analytics-consent";
const BUSUANZI_SCRIPT_ID = "shiji-busuanzi-counter";
const GOOGLE_TAG_SCRIPT_ID = "shiji-google-tag";
const MICROSOFT_UET_SCRIPT_ID = "shiji-microsoft-uet";

let activeGoogleTagId: string | undefined;
let activeMicrosoftUetTagId: string | undefined;

declare global {
  interface Window {
    _hmt?: unknown[][];
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    uetq?: unknown[];
    doNotTrack?: string;
  }
}

function canUseBrowserTracking() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean; doNotTrack?: string; msDoNotTrack?: string };
  const dnt = window.doNotTrack ?? nav.doNotTrack ?? nav.msDoNotTrack;
  return dnt !== "1" && dnt !== "yes" && nav.globalPrivacyControl !== true;
}

function readConsent() {
  if (typeof window === "undefined") return false;
  try { return window.localStorage.getItem(CONSENT_KEY) === "granted"; } catch { return false; }
}

function setConsentStorage(enabled: boolean) {
  try { if (enabled) window.localStorage.setItem(CONSENT_KEY, "granted"); else window.localStorage.removeItem(CONSENT_KEY); } catch {}
}

function dispatchConsentChange() { window.dispatchEvent(new Event(CONSENT_EVENT)); }
function ensureBaiduQueue() { window._hmt = window._hmt || []; return window._hmt; }
function ensureGoogleQueue() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(...args: unknown[]) { window.dataLayer?.push(args); };
  return window.gtag;
}
function ensureMicrosoftQueue() { window.uetq = window.uetq || []; return window.uetq; }

function loadBusuanziScript() {
  const existing = document.getElementById(BUSUANZI_SCRIPT_ID);
  if (existing) return;
  const script = document.createElement("script");
  script.id = BUSUANZI_SCRIPT_ID;
  script.defer = true;
  script.src = "https://cdn.busuanzi.cc/busuanzi/3.6.9/busuanzi.min.js";
  document.body.appendChild(script);
}

function loadBaiduScript(baiduTrackingId: string) {
  const existing = document.querySelector<HTMLScriptElement>(`script[data-baidu-tongji="${baiduTrackingId}"]`);
  if (existing) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://hm.baidu.com/hm.js?${baiduTrackingId}`;
  script.dataset.baiduTongji = baiduTrackingId;
  document.head.appendChild(script);
}

function loadGoogleTagScript(googleTagId: string) {
  activeGoogleTagId = googleTagId;
  const gtag = ensureGoogleQueue();
  gtag("js", new Date());
  gtag("config", googleTagId, { anonymize_ip: true });
  const existing = document.getElementById(GOOGLE_TAG_SCRIPT_ID);
  if (existing) return;
  const script = document.createElement("script");
  script.id = GOOGLE_TAG_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleTagId)}`;
  document.head.appendChild(script);
}

function loadMicrosoftUetScript(microsoftUetTagId: string) {
  activeMicrosoftUetTagId = microsoftUetTagId;
  const uetq = ensureMicrosoftQueue();
  uetq.push("event", "page_view", { page_path: window.location.pathname + window.location.hash });
  const existing = document.getElementById(MICROSOFT_UET_SCRIPT_ID);
  if (existing) return;
  const script = document.createElement("script");
  script.id = MICROSOFT_UET_SCRIPT_ID;
  script.async = true;
  script.src = "https://bat.bing.com/bat.js";
  document.head.appendChild(script);
}

function removeTrackingScripts(ids: string[]) {
  for (const id of ids) document.getElementById(id)?.remove();
}

function useConsentState() {
  const [consent, setConsent] = useState(false);
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    function sync() {
      const browserAllowed = canUseBrowserTracking();
      setBlocked(!browserAllowed);
      setConsent(browserAllowed && readConsent());
    }
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(CONSENT_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(CONSENT_EVENT, sync);
    };
  }, []);
  return useMemo(() => ({ consent, blocked }), [blocked, consent]);
}

export function setAnalyticsConsent(enabled: boolean) {
  if (typeof window === "undefined") return;
  setConsentStorage(enabled);
  dispatchConsentChange();
}

export function trackPageView(pathname: string) {
  if (typeof window === "undefined" || !canUseBrowserTracking() || !readConsent()) return;
  ensureBaiduQueue().push(["_trackPageview", pathname]);
  if (activeGoogleTagId) ensureGoogleQueue()("config", activeGoogleTagId, { page_path: pathname, anonymize_ip: true });
  if (activeMicrosoftUetTagId) ensureMicrosoftQueue().push("event", "page_view", { page_path: pathname });
}

export function trackEvent(category: string, action: string, label?: string) {
  if (typeof window === "undefined" || !canUseBrowserTracking() || !readConsent()) return;
  ensureBaiduQueue().push(["_trackEvent", category, action, label]);
  ensureGoogleQueue()("event", action, { event_category: category, event_label: label });
  ensureMicrosoftQueue().push("event", action, { event_category: category, event_label: label });
}

export function Analytics({ baiduTrackingId, googleTagId, microsoftUetTagId }: { baiduTrackingId?: string; googleTagId?: string; microsoftUetTagId?: string }) {
  const { consent, blocked } = useConsentState();
  useEffect(() => {
    if (!consent) return;
    if (baiduTrackingId) { ensureBaiduQueue(); loadBaiduScript(baiduTrackingId); }
    if (googleTagId) loadGoogleTagScript(googleTagId);
    if (microsoftUetTagId) loadMicrosoftUetScript(microsoftUetTagId);
  }, [baiduTrackingId, consent, googleTagId, microsoftUetTagId]);
  useEffect(() => {
    if (!blocked && consent) return;
    activeGoogleTagId = undefined;
    activeMicrosoftUetTagId = undefined;
    removeTrackingScripts([GOOGLE_TAG_SCRIPT_ID, MICROSOFT_UET_SCRIPT_ID]);
    if (baiduTrackingId) document.querySelector<HTMLScriptElement>(`script[data-baidu-tongji="${baiduTrackingId}"]`)?.remove();
  }, [baiduTrackingId, blocked, consent]);
  return null;
}

export function VisitCounter({ provider }: { provider?: "busuanzi" }) {
  useEffect(() => { if (provider === "busuanzi") loadBusuanziScript(); }, [provider]);
  if (provider !== "busuanzi") return null;
  return <div className="visit-counter" aria-label="访问次数"><span>访问 <b id="busuanzi_site_pv">加载中</b> 次</span><span>访客 <b id="busuanzi_site_uv">加载中</b> 人</span></div>;
}

export function PrivacyControls() {
  const { consent, blocked } = useConsentState();
  return <div className="privacy-controls"><div className="privacy-status"><strong>{blocked ? "浏览器已阻止统计" : consent ? "统计已启用" : "统计未启用"}</strong><span>{blocked ? "当前浏览器的 Do Not Track 或 Global Privacy Control 会阻止运营统计脚本。" : consent ? "当前设备已授权运营统计，可用于页面访问和广告点击统计。" : "百度统计、Google Tag 和 Microsoft UET 等脚本只会在你明确同意后加载；顶部访客数为公开访问计数展示。"}</span></div><div className="privacy-actions"><button type="button" className="primary" onClick={() => setAnalyticsConsent(true)} disabled={blocked}>允许统计</button><button type="button" className="secondary" onClick={() => setAnalyticsConsent(false)}>关闭统计</button></div></div>;
}
