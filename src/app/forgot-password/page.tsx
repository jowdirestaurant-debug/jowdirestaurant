import { SiteChrome } from "@/components/site-chrome";
import { AuthForm } from "@/components/auth-form";

export default function ForgotPage() {
  return (
    <SiteChrome>
      <AuthForm mode="forgot" />
    </SiteChrome>
  );
}
