import { SiteChrome } from "@/components/site-chrome";
import { AuthForm } from "@/components/auth-form";

export default function ResetPage() {
  return (
    <SiteChrome>
      <AuthForm mode="reset" />
    </SiteChrome>
  );
}
