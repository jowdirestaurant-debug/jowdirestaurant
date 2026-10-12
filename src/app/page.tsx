import { SiteChrome } from "@/components/site-chrome";
import { HomeView } from "@/components/home-view";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <SiteChrome>
      <HomeView />
    </SiteChrome>
  );
}
