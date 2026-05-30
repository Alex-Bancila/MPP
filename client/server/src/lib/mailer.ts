export interface EmailMessage {
  to: string
  subject: string
  body: string
}

export interface Mailer {
  sendEmail: (message: EmailMessage) => Promise<void>
}

/**
 * Pluggable mailer.
 *
 * By default it logs the email to the server console — matching the app's existing
 * convention for password-reset and magic-link tokens (see routes/auth.ts). When SMTP
 * credentials are configured via environment variables a real transport can be wired in
 * here without touching any call sites.
 */
export const createMailer = (): Mailer => {
  return {
    sendEmail: async (message) => {
      // Real SMTP delivery can be plugged in here (e.g. nodemailer reading SMTP_* env vars).
      console.log(
        `\n[Mailer] To: ${message.to}\n[Mailer] Subject: ${message.subject}\n[Mailer] ${message.body}\n`,
      )
    },
  }
}
