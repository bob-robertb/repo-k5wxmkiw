# URL Shortener

A simple URL shortener API built with [Hono](https://hono.dev).

## Features

- **Create short URLs** — `POST /api/shorten` with `{ "url": "https://..." }`
- **Redirect** — `GET /:code` redirects to the original URL
- **Track clicks** — Each redirect increments the click counter
- **List all URLs** — `GET /api/urls` returns all shortened URLs with click counts
- **URL stats** — `GET /api/urls/:code` returns stats for a single URL
- **Frontend** — Simple web UI at `GET /`

## Quick Start

```bash
npm install
npm run dev
```

Then open http://localhost:3456 in your browser.

## API

### POST /api/shorten

Create a shortened URL.

```json
{ "url": "https://example.com/some-long-path" }
```

Response (201):

```json
{
  "shortUrl": "http://localhost:3456/abc123",
  "code": "abc123",
  "originalUrl": "https://example.com/some-long-path"
}
```

### GET /:code

Redirects (302) to the original URL and increments the click counter.

### GET /api/urls

List all shortened URLs with their click counts.

### GET /api/urls/:code

Get stats for a specific short URL.
