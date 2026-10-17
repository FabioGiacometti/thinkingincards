const WAITLIST_RECIPIENT = 'fabiog.inbox@gmail.com'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ message: 'Method not allowed.' })
  }

  const { email, website } = request.body || {}
  if (website) return response.status(200).json({ message: 'Thanks for signing up. We will email you when Thinking in CARDS is ready.' })

  const address = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (address.length > 254 || !EMAIL_PATTERN.test(address)) {
    return response.status(400).json({ message: 'Enter a valid email address.' })
  }

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) {
    return response.status(503).json({ message: 'The waitlist is unavailable right now. Please try again shortly.' })
  }

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [WAITLIST_RECIPIENT],
        reply_to: address,
        subject: 'New Thinking in CARDS waitlist signup',
        text: `A new person joined the Thinking in CARDS waitlist.\n\nEmail: ${address}`,
      }),
    })

    if (!resendResponse.ok) {
      console.error('Resend rejected a waitlist email:', resendResponse.status)
      return response.status(502).json({ message: 'We could not submit your signup. Please try again.' })
    }

    return response.status(200).json({ message: 'Thanks for signing up. We will email you when Thinking in CARDS is ready.' })
  } catch (error) {
    console.error('Waitlist email request failed:', error)
    return response.status(502).json({ message: 'We could not submit your signup. Please try again.' })
  }
}
