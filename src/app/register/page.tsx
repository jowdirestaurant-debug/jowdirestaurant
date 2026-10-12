import { SiteChrome } from "@/components/site-chrome";
import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  return (
    <SiteChrome>
      <AuthForm mode="register" />
    </SiteChrome>
  );
}
