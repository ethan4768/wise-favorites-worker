import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
import { html } from 'hono/html'
import { HTTPException } from 'hono/http-exception'
import { logger } from 'hono/logger'
import api from './api'

const app = new Hono()

// Mount Builtin Middleware
app.use('*', logger())
// auth 
app.use(
  '/api/*',
  bearerAuth({
    verifyToken: (token, c) => {
      return c.env?.BEARER_TOKENS.includes(token)
    },
  })
)

// Custom Middleware

// Add X-Response-Time header
app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  c.header('X-Response-Time', `${ms}ms`)
})

// Custom Not Found Message
app.notFound((c) => {
  return c.text('404 Not Found', 404)
})

// Error handling
app.onError((err, c) => {
  console.error(`${err}`)
  if (err instanceof HTTPException) {
    return err.getResponse()
  }
  return c.text('Something Error', 500)
})

// Default Page
app.get('/', (c) => {
  return c.html(html`<h1>Wise Favorite</h1>`)
})

// API 
app.route('/api', api)


export default app