import { Resend } from "resend";
import type { Lang } from "./types";
import { appUrl } from "./utils";

function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || "Jowdi Restaurant <beth.t@example.com>";
}

function wrap(lang: Lang, title: string, bodyHtml: string): string {
  const dir = lang === "ar" ? "rtl" : "ltr";
  const align = lang === "ar" ? "right" : "left";
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
  <body style="margin:0;background:#0a0a0a;color:#f5f0e8;font-family:Cairo,Tahoma,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#14110e;border:1px solid #3a3228;border-radius:18px;padding:32px;text-align:${align};direction:${dir};">
            <tr>
              <td>
                <p style="margin:0 0 8px;color:#c4a574;letter-spacing:3px;font-size:12px;text-transform:uppercase;">Jowdi Restaurant · مطعم الجودي</p>
                <h1 style="margin:0 0 16px;font-size:24px;color:#f5f0e8;">${title}</h1>
                ${bodyHtml}
                <p style="margin:28px 0 0;color:#8b7355;font-size:12px;">${lang === "ar" ? "مطعم الجودي — المنامة، مملكة البحرين" : "Jowdi Restaurant — Manama, Kingdom of Bahrain"}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendVerificationEmail(email: string, code: string, lang: Lang) {
  const resend = client();
  const title = lang === "ar" ? "تأكيد حسابك" : "Verify your account";
  const html = wrap(
    lang,
    title,
    `<p style="line-height:1.7;color:#d9cbb8;">${
      lang === "ar"
        ? "استخدم رمز التحقق التالي لإتمام إنشاء حسابك في مطعم الجودي:"
        : "Use the verification code below to complete your Jowdi Restaurant account:"
    }</p>
    <p style="font-size:32px;letter-spacing:8px;color:#c4a574;font-weight:700;margin:20px 0;">${code}</p>
    <p style="color:#8b7355;font-size:13px;">${
      lang === "ar" ? "ينتهي الرمز خلال 15 دقيقة." : "This code expires in 15 minutes."
    }</p>`,
  );
  if (!resend) {
    console.info(`[email:dev] verification ${email} code=${code}`);
    return { ok: true, skipped: true };
  }
  await resend.emails.send({
    from: fromAddress(),
    to: email,
    subject: title,
    html,
  });
  return { ok: true, skipped: false };
}

export async function sendResetEmail(email: string, code: string, lang: Lang) {
  const resend = client();
  const title = lang === "ar" ? "استعادة كلمة المرور" : "Reset your password";
  const html = wrap(
    lang,
    title,
    `<p style="line-height:1.7;color:#d9cbb8;">${
      lang === "ar"
        ? "رمز استعادة كلمة المرور الخاص بحساب مطعم الجودي:"
        : "Your Jowdi Restaurant password recovery code:"
    }</p>
    <p style="font-size:32px;letter-spacing:8px;color:#c4a574;font-weight:700;margin:20px 0;">${code}</p>
    <p style="color:#8b7355;font-size:13px;">${
      lang === "ar" ? "إذا لم تطلب هذا الرمز يمكن تجاهل الرسالة." : "If you did not request this, you can ignore this email."
    }</p>
    <p style="color:#8b7355;font-size:13px;">${appUrl()}</p>`,
  );
  if (!resend) {
    console.info(`[email:dev] reset ${email} code=${code}`);
    return { ok: true, skipped: true };
  }
  await resend.emails.send({
    from: fromAddress(),
    to: email,
    subject: title,
    html,
  });
  return { ok: true, skipped: false };
}

export async function sendOrderEmail(email: string, orderNumber: string, totalLabel: string, lang: Lang) {
  const resend = client();
  const title = lang === "ar" ? `تأكيد الطلب ${orderNumber}` : `Order confirmed ${orderNumber}`;
  const html = wrap(
    lang,
    title,
    `<p style="line-height:1.7;color:#d9cbb8;">${
      lang === "ar"
        ? `شكراً لطلبك من مطعم الجودي. رقم طلبك <strong>${orderNumber}</strong> بإجمالي ${totalLabel}.`
        : `Thank you for ordering from Jowdi Restaurant. Your order <strong>${orderNumber}</strong> totals ${totalLabel}.`
    }</p>`,
  );
  if (!resend) {
    console.info(`[email:dev] order ${email} ${orderNumber}`);
    return { ok: true, skipped: true };
  }
  await resend.emails.send({
    from: fromAddress(),
    to: email,
    subject: title,
    html,
  });
  return { ok: true, skipped: false };
}
