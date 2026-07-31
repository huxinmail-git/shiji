import { permanentRedirect } from "next/navigation";

export const dynamic = "force-static";

export default function Home() {
  permanentRedirect("/chapters/1");
}
