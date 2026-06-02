import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { html } from 'hono/html'

interface UrlEntry {
  code: string
  originalUrl: string
  clicks: number
  createdAt: string
}

const app = new Hono()

// In-memory store
const urls = new Map<string, UrlEntry>()

// Enable CORS for API routes
app.use('/api/*', cors())

// Generate a random short code
function generateCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// --- Frontend ---
app.get('/', (c) => {
  return c.html(html`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>URL Shortener</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 2rem; }
    .container { max-width: 700px; margin: 0 auto; }
    h1 { color: #333; margin-bottom: 1.5rem; text-align: center; }
    .card { background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 1.5rem; }
    .form-group { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    input[type="url"] { flex: 1; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; }
    button { padding: 0.75rem 1.5rem; background: #4f46e5; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; font-weight: 500; }
    button:hover { background: #4338ca; }
    .result { margin-top: 1rem; padding: 1rem; background: #ecfdf5; border-radius: 4px; display: none; }
    .result a { color: #4f46e5; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { text-align: left; padding: 0.75rem; border-bottom: 1px solid #eee; }
    th { color: #666; font-size: 0.875rem; text-transform: uppercase; }
    td a { color: #4f46e5; text-decoration: none; }
    .clicks { font-weight: 600; color: #059669; }
    .empty { text-align: center; color: #999; padding: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>URL Shortener</h1>
    <div class="card">
      <h2 style="margin-bottom: 1rem;">Shorten a URL</h2>
      <div class="form-group">
        <input type="url" id="urlInput" placeholder="https://example.com/very-long-url" />
        <button onclick="shortenUrl()">Shorten</button>
      </div>
      <div class="result" id="result">
        Short URL: <a id="shortUrl" href="#" target="_blank"></a>
      </div>
    </div>
    <div class="card">
      <h2 style="margin-bottom: 1rem;">All URLs</h2>
      <button onclick="loadUrls()" style="margin-bottom: 1rem; background: #059669;">Refresh</button>
      <div id="urlList"><p class="empty">No URLs yet. Create one above!</p></div>
    </div>
  </div>
  <script>
    const BASE = window.location.origin;

    async function shortenUrl() {
      const input = document.getElementById('urlInput');
      const url = input.value.trim();
      if (!url) return alert('Please enter a URL');

      const res = await fetch(BASE + '/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (data.shortUrl) {
        const resultDiv = document.getElementById('result');
        const shortUrlEl = document.getElementById('shortUrl');
        shortUrlEl.href = data.shortUrl;
        shortUrlEl.textContent = data.shortUrl;
        resultDiv.style.display = 'block';
        input.value = '';
        loadUrls();
      } else {
        alert(data.error || 'Something went wrong');
      }
    }

    async function loadUrls() {
      const res = await fetch(BASE + '/api/urls');
      const data = await res.json();
      const container = document.getElementById('urlList');
      if (data.urls.length === 0) {
        container.innerHTML = '<p class="empty">No URLs yet. Create one above!</p>';
        return;
      }
      let tableHtml = '<table><thead><tr><th>Short Code</th><th>Original URL</th><th>Clicks</th></tr></thead><tbody>';
      for (const entry of data.urls) {
        tableHtml += '<tr>';
        tableHtml += '<td><a href="' + BASE + '/' + entry.code + '" target="_blank">' + entry.code + '</a></td>';
        tableHtml += '<td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + entry.originalUrl + '</td>';
        tableHtml += '<td class="clicks">' + entry.clicks + '</td>';
        tableHtml += '</tr>';
      }
      tableHtml += '</tbody></table>';
      container.innerHTML = tableHtml;
    }

    // Load URLs on page load
    loadUrls();
  </script>
</body>
</html>`)
})

// --- API Routes ---

// Create a short URL
app.post('/api/shorten', async (c) => {
  const body = await c.req.json<{ url: string }>()
  const { url } = body

  if (!url) {
    return c.json({ error: 'URL is required' }, 400)
  }

  try {
    new URL(url)
  } catch {
    return c.json({ error: 'Invalid URL format' }, 400)
  }

  const code = generateCode()
  const entry: UrlEntry = {
    code,
    originalUrl: url,
    clicks: 0,
    createdAt: new Date().toISOString(),
  }
  urls.set(code, entry)

  const shortUrl = new URL(`/${code}`, c.req.url).toString()
  return c.json({ shortUrl, code, originalUrl: url }, 201)
})

// List all URLs
app.get('/api/urls', (c) => {
  const allUrls = Array.from(urls.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  return c.json({ urls: allUrls })
})

// Get stats for a specific URL
app.get('/api/urls/:code', (c) => {
  const code = c.req.param('code')
  const entry = urls.get(code)
  if (!entry) {
    return c.json({ error: 'URL not found' }, 404)
  }
  return c.json(entry)
})

// Redirect short URL
app.get('/:code', (c) => {
  const code = c.req.param('code')
  const entry = urls.get(code)
  if (!entry) {
    return c.json({ error: 'URL not found' }, 404)
  }
  entry.clicks++
  return c.redirect(entry.originalUrl, 302)
})

// Start server
const port = 3456
console.log(`URL Shortener running at http://localhost:${port}`)
serve({ fetch: app.fetch, port })
