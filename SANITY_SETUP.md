# Sanity Blog Setup

This site now has a standalone Sanity Studio and public blog pages.

## 1. Sanity project

This site is configured for Sanity project `8flspim8` and dataset `production`.

## 2. Configure the Studio

Run the local Studio:

```powershell
npm run studio
```

Studio will run locally, usually at:

```text
http://localhost:3333
```

## 3. Configure the public blog

`sanity.public.config.js` is configured as:

```js
window.FAC_SANITY = {
  projectId: '8flspim8',
  dataset: 'production',
  apiVersion: '2026-07-14',
  useCdn: true
}
```

The public pages are:

- `blog/index.html`
- `blog/your-post-slug/index.html`, served at `/blog/your-post-slug/`

## Build and upload with FTP / file manager

After publishing, editing, deleting, or changing a post slug in Sanity, run:

```powershell
npm run build
node --test scripts/test-blog.cjs
```

Use Node.js 22 or newer. The blog build uses Node's built-in tools and does not require installing Studio dependencies. It fetches published content and generates complete article HTML, titles, descriptions, canonical links, structured data, static blog cards, homepage cards, and sitemap entries. Visitors and search engines do not need JavaScript to read posts or find their links.

Upload these files together into your existing website root (the folder containing `booking.html`):

- `blog/` including every generated post subfolder and its `index.html`
- `index.html` (homepage with the latest three posts)
- `sitemap.xml`
- `.htaccess` (preserves redirects from the older query-string post URLs)

Upload post subfolders first, then the listings and sitemap. Keep the existing site CSS, JavaScript, images, and other files. If a post was removed or its slug changed, remove its old generated folder from the server too; an FTP upload does not remove stale remote files. Keep a redirect if an old slug should lead to its replacement.

To build, verify, and create `dist/blog-upload.zip` in one step on Windows, run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/package-blog.ps1
```

The generated upload ZIP contains these paths at its root (only generated blog pages, not the old JavaScript template); extract its contents into the existing website root. A ZIP is a snapshot: rebuild and recreate it after subsequent changes. Publishing in Sanity alone does not create files on an FTP host. Automatic updates would need a separate authenticated deployment integration.

Verify `/blog/cupping-therapy-benefits-foot-ankle-pain/` after upload. It should return HTTP 200, and View Page Source should contain the full article. HTML availability makes the content crawlable; Google controls whether and when it indexes a page.

## 4. Allow browser access

Use Sanity Manage **API > CORS origins**, not the **Studios** tab. For local testing, add:

```text
http://localhost:3333
http://localhost:8000
```

Allow credentials for `http://localhost:3333` because Sanity Studio uses your logged-in session. If you serve the static website locally on another port, add that origin too.
