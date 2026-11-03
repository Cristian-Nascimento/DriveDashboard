import nodemailer from "nodemailer";

/**
 * Envia e-mail via SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM).
 * Sem SMTP configurado, apenas escreve no log do servidor — útil em desenvolvimento.
 * Retorna true se o e-mail foi realmente enviado.
 */
export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.log(`[mail:dev] Para: ${to}\nAssunto: ${subject}\n${text}\n`);
    return false;
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({ from: process.env.MAIL_FROM ?? process.env.SMTP_USER, to, subject, text });
  return true;
}
