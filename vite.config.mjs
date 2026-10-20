import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import waitlistHandler from './api/waitlist.js'

function waitlistDevApi() {
  return {
    name: 'waitlist-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/waitlist', (request, response, next) => {
        const send = (statusCode, payload) => {
          response.statusCode = statusCode
          response.setHeader('Content-Type', 'application/json; charset=utf-8')
          response.end(JSON.stringify(payload))
        }

        const adaptedResponse = {
          setHeader: (name, value) => response.setHeader(name, value),
          status(statusCode) {
            response.statusCode = statusCode
            return this
          },
          json(payload) {
            response.setHeader('Content-Type', 'application/json; charset=utf-8')
            response.end(JSON.stringify(payload))
          },
        }

        if (request.method !== 'POST') {
          waitlistHandler({ method: request.method }, adaptedResponse)
          return
        }

        let rawBody = ''
        request.setEncoding('utf8')
        request.on('data', (chunk) => {
          rawBody += chunk
          if (rawBody.length > 4096) {
            send(413, { message: 'Request is too large.' })
            request.destroy()
          }
        })
        request.on('end', async () => {
          if (response.writableEnded) return
          let body
          try {
            body = JSON.parse(rawBody || '{}')
          } catch {
            send(400, { message: 'Invalid request.' })
            return
          }
          try {
            await waitlistHandler({ method: 'POST', body }, adaptedResponse)
          } catch (error) {
            next(error)
          }
        })
      })
    },
  }
}

// The Privacy Policy ships only when PUBLISH_PRIVACY=true (see CHANGELOG.md). Until then a
// production build leaves out privacy.html, drops [data-privacy-link] footer links, and turns
// [data-privacy-ref] links into plain text. The dev server always shows them for review.
function privacyPublication(publish) {
  return {
    name: 'privacy-publication',
    transformIndexHtml(html) {
      if (publish) return html
      return html
        .replace(/<a\b[^>]*\bdata-privacy-link\b[^>]*>.*?<\/a>/gs, '')
        .replace(/<a\b[^>]*\bdata-privacy-ref\b[^>]*>(.*?)<\/a>/gs, '$1')
    },
  }
}

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const publishPrivacy = command === 'serve' || (process.env.PUBLISH_PRIVACY ?? env.PUBLISH_PRIVACY) === 'true'
  if (!process.env.RESEND_API_KEY && env.RESEND_API_KEY) process.env.RESEND_API_KEY = env.RESEND_API_KEY
  if (!process.env.RESEND_FROM_EMAIL && env.RESEND_FROM_EMAIL) process.env.RESEND_FROM_EMAIL = env.RESEND_FROM_EMAIL
  if (!process.env.RESEND_EMAIL_DOMAIN && env.RESEND_EMAIL_DOMAIN) process.env.RESEND_EMAIL_DOMAIN = env.RESEND_EMAIL_DOMAIN

  return {
    plugins: [waitlistDevApi(), privacyPublication(publishPrivacy)],
    build: {
      rollupOptions: {
        input: {
          main: resolve(import.meta.dirname, 'index.html'),
          terms: resolve(import.meta.dirname, 'terms.html'),
          ...(publishPrivacy ? { privacy: resolve(import.meta.dirname, 'privacy.html') } : {}),
        },
      },
    },
  }
})
