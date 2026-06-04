import nodemailer, { type Transporter } from 'nodemailer'

export interface EmailMessage {
  to: string
  subject: string
  body: string
}

export interface Mailer {
  sendEmail: (message: EmailMessage) => Promise<void>
}

interface Sender {
  email: string
  name?: string
}

/** Parse a MAIL_FROM value like `Music Core <no-reply@x.com>` or `no-reply@x.com`. */
const parseFrom = (raw: string): Sender => {
  const match = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/)
  if (match) {
    return { name: match[1] || undefined, email: match[2].trim() }
  }
  return { email: raw.trim() }
}

/**
 * Send via Brevo's transactional email HTTP API (https://api.brevo.com, port 443).
 *
 * Preferred in the cloud because many hosts (Render, Fly, etc.) block outbound SMTP
 * ports (25/465/587), which makes nodemailer time out with ETIMEDOUT. HTTPS is never
 * blocked, so this path works where SMTP can't connect.
 */
const sendViaBrevoApi = async (
  apiKey: string,
  from: Sender,
  message: EmailMessage,
): Promise<void> => {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: from.email, ...(from.name ? { name: from.name } : {}) },
      to: [{ email: message.to }],
      subject: message.subject,
      textContent: message.body,
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Brevo API responded ${response.status}: ${detail}`)
  }
}

/**
 * Build an SMTP transport from environment variables, or return null when SMTP is not
 * configured. Used for local dev; in the cloud prefer the Brevo HTTP API (BREVO_API_KEY).
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
    secure: port === 465, // 465 = implicit TLS, 587/2525 = STARTTLS
    auth: { user, pass },
  })
}

/**
 * Pluggable mailer. Delivery preference:
 *   1. Brevo HTTP API   — when BREVO_API_KEY is set (works on hosts that block SMTP)
 *   2. SMTP (nodemailer) — when SMTP_* are set (local dev)
 *   3. Console log       — otherwise (so tokens are still visible in dev)
 */
export const createMailer = (): Mailer => {
  const apiKey = process.env.BREVO_API_KEY
  const transport = apiKey ? null : buildTransport()
  const from = parseFrom(
    process.env.MAIL_FROM ?? process.env.SMTP_USER ?? 'no-reply@musiccore.app',
  )

  if (apiKey) {
    console.log('[Mailer] Using Brevo HTTP API for email delivery.')
  } else if (transport) {
    console.log('[Mailer] Using SMTP for email delivery.')
  } else {
    console.warn('[Mailer] No email transport configured — emails will be logged only.')
  }

  return {
    sendEmail: async (message) => {
      try {
        if (apiKey) {
          await sendViaBrevoApi(apiKey, from, message)
          console.log(`[Mailer] Sent "${message.subject}" to ${message.to} via Brevo API`)
          return
        }
        if (transport) {
          await transport.sendMail({
            from: process.env.MAIL_FROM ?? from.email,
            to: message.to,
            subject: message.subject,
            text: message.body,
          })
          console.log(`[Mailer] Sent "${message.subject}" to ${message.to}`)
          return
        }
        console.log(
          `\n[Mailer] To: ${message.to}\n[Mailer] Subject: ${message.subject}\n[Mailer] ${message.body}\n`,
        )
      } catch (error) {
        // Never let a mail failure break the auth flow — log and continue.
        console.error(`[Mailer] Failed to send email to ${message.to}:`, error)
      }
    },
  }
}
