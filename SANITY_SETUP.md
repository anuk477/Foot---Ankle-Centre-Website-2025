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

The generated upload ZIP contains these paths at its root (only generated blog pages, not the old JavaScript template); extract its contents into the existing website root. A ZIP is a snapshot: rebuild and recreate it after subsequent changes. Publishing in Sanity alone does not create files on the website host. To enable automatic updates, follow the GitHub Actions and Sanity webhook setup below.

Verify `/blog/cupping-therapy-benefits-foot-ankle-pain/` after upload. It should return HTTP 200, and View Page Source should contain the full article. HTML availability makes the content crawlable; Google controls whether and when it indexes a page.

## 4. Allow browser access

Use Sanity Manage **API > CORS origins**, not the **Studios** tab. For local testing, add:

```text
http://localhost:3333
http://localhost:8000
```

Allow credentials for `http://localhost:3333` because Sanity Studio uses your logged-in session. If you serve the static website locally on another port, add that origin too.

## 5. Automatically rebuild and upload published posts

The workflow at `.github/workflows/rebuild-blog.yml` rebuilds the static blog and uploads the generated pages over SFTP. It can be started by a Sanity webhook or run manually from GitHub Actions.

The workflow must first be pushed to the repository's default branch (`main`) before GitHub can run it. The current workflow listens for Sanity's `repository_dispatch` event and can also be started manually.

### Add SFTP secrets in GitHub

In the `Foot---Ankle-Centre-Website-2025` repository, open **Settings → Secrets and variables → Actions → New repository secret** and add:

- `SFTP_HOST`: the SFTP server hostname.
- `SFTP_PORT`: the SFTP port, usually `22` (optional; the workflow defaults to `22`).
- `SFTP_USERNAME`: a dedicated SFTP user restricted to the website root.
- `SFTP_PRIVATE_KEY`: the private SSH key for that user. Do not commit this key.
- `SFTP_KNOWN_HOSTS`: the verified SSH host-key line supplied by the hosting provider (or verified with them). Do not disable host-key checking.
- `SFTP_REMOTE_PATH`: the absolute remote path to the website root, the folder containing `booking.html`.

The workflow uses SSH key authentication. Add the matching public key to the hosting account's authorized SSH keys; if the host only offers password-based SFTP, this workflow needs to be adapted before use.

The workflow uploads `index.html`, `sitemap.xml`, `blog/index.html`, and each generated blog post page. It does not mirror or delete other website files.

### Configure the Sanity webhook

Create a fine-grained GitHub personal access token limited to this repository, with **Contents: read and write** permission. GitHub requires that permission for the repository dispatch endpoint. Keep the token only in the Sanity webhook configuration; never add it to the website or this repository.

In Sanity Manage, open **API → Webhooks** and create a webhook with:

- **URL:** `https://api.github.com/repos/anuk477/Foot---Ankle-Centre-Website-2025/dispatches`
- **Method:** `POST`
- **Dataset:** `production`
- **Trigger on:** `Create` and `Update`
- **Filter:** `_type == "post" && defined(slug.current)`
- **Projection:** `{ "event_type": "sanity-post-published" }`
- **Headers:** `Accept: application/vnd.github+json`, `Content-Type: application/json`, `X-GitHub-Api-Version: 2022-11-28`, and `Authorization: Bearer <the fine-grained token>`

Sanity ignores draft documents by default, so the workflow runs when the published post changes, not while someone edits a draft. After saving the webhook, publish a test post and check **Actions → Rebuild and deploy Sanity blog** for the run result. You can also run the workflow manually from the Actions tab after adding the SFTP secrets.

