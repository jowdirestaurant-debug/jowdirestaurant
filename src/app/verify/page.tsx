import { SiteChrome } from "@/components/site-chrome";
import { AuthForm } from "@/components/auth-form";

export default function VerifyPage() {
  return (
    <SiteChrome>
      <AuthForm mode="verify" />
    </SiteChrome>
  );
}
