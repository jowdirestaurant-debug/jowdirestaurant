import { SiteChrome } from "@/components/site-chrome";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <SiteChrome>
      <AuthForm mode="login" />
    </SiteChrome>
  );
}
