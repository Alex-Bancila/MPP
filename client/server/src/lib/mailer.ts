import nodemailer, { type Transporter } from 'nodemailer'

export interface EmailMessage {
  to: string
  subject: string
  body: string
}

export interface Mailer {
  sendEmail: (message: EmailMessage) => Promise<void>
}

/**
 * Build an SMTP transport from environment variables, or return null when SMTP
 * is not configured (e.g. local dev / tests) so the mailer falls back to logging.
 *
 * Provider-agnostic — works with Brevo, Gmail, SendGrid, Mailgun, etc. Just set:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS  (and optionally MAIL_FROM)
 */
const buildTransport = (): Transporter | null => {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) {
    return null
  }

  const port = Number(process.env.SMTP_PORT ?? 587)
  return nodemailer.createTransport({
    host,
    port,
    // 465 = implicit TLS, 587 = STARTTLS (upgraded after connect).
    secure: port === 465,
    auth: { user, pass },
  })
}

/**
 * Pluggable mailer.
 *
 * When SMTP credentials are present it delivers real email via nodemailer; otherwise
 * it logs the message to the server console — matching the app's local-dev convention
 * for password-reset and magic-link tokens (see routes/auth.ts).
 */
export const createMailer = (): Mailer => {
  const transport = buildTransport()
  const from =
    process.env.MAIL_FROM ?? process.env.SMTP_USER ?? 'no-reply@musiccore.app'

  if (!transport) {
    console.warn('[Mailer] SMTP not configured — emails will be logged to the console only.')
  }

  return {
    sendEmail: async (message) => {
      if (!transport) {
        console.log(
          `\n[Mailer] To: ${message.to}\n[Mailer] Subject: ${message.subject}\n[Mailer] ${message.body}\n`,
        )
        return
      }
      try {
        await transport.sendMail({
          from,
          to: message.to,
          subject: message.subject,
          text: message.body,
        })
        console.log(`[Mailer] Sent "${message.subject}" to ${message.to}`)
      } catch (error) {
        // Never let a mail failure break the auth flow — log and continue.
        console.error(`[Mailer] Failed to send email to ${message.to}:`, error)
      }
    },
  }
}
