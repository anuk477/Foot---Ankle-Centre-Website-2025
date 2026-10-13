const {test} = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const {listingTemplate, validatePosts} = require('./generate-blog')

test('rejects unsafe, reserved and duplicate slugs before writing files', () => {
  for (const slug of ['../booking', 'index', 'post', 'con', 'a/b', 'a?b', '']) {
    assert.throws(() => validatePosts([{slug: {current: slug}}]))
  }
  assert.throws(() => validatePosts([{slug: {current: 'example'}}, {slug: {current: 'example'}}]))
  assert.deepEqual([...validatePosts([{slug: {current: 'valid-post'}}])], ['valid-post'])
})

test('rebuilding replaces listings without touching surrounding content or fetching in the browser', () => {
  const template = '<header>Keep me</header><div data-blog-list><p class="blog-status">Loading posts...</p></div><footer>Keep me too</footer><script defer src="../blog.js?v=1.0.2"></script>'
  const post = {title: 'Example <title> $&', slug: {current: 'example'}, categories: [null]}
  const first = listingTemplate(template, [post], 'project', 'production')
  assert.match(first, /Example &lt;title&gt; \$&/)
  assert.match(first, /href="\/blog\/example\/"/)
  assert.doesNotMatch(first, /blog\.js|data-blog-list|Loading posts/)
  assert.equal(listingTemplate(first, [post], 'project', 'production'), first)
  const empty = listingTemplate(first, [], 'project', 'production')
  assert.doesNotMatch(empty, /href="\/blog\/example\/"/)
  assert.match(empty, /<header>Keep me<\/header>/)
  assert.match(empty, /<footer>Keep me too<\/footer>/)
})

test('built pages contain article HTML, metadata and resolvable listing links', () => {
  const root = path.resolve(__dirname, '..')
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8')
  const listing = fs.readFileSync(path.join(root, 'blog/index.html'), 'utf8')
  const slugs = [...listing.matchAll(/href="\/blog\/([^/]+)\/"/g)].map(match => match[1])
  assert.ok(slugs.includes('cupping-therapy-benefits-foot-ankle-pain'))
  for (const slug of new Set(slugs)) {
    const html = fs.readFileSync(path.join(root, 'blog', slug, 'index.html'), 'utf8')
    assert.match(html, /<h1>[^<]+<\/h1>/)
    assert.match(html, /<div class="blog-content">[\s\S]+?<\/div>/)
    assert.doesNotMatch(html, /blog\.js|Loading post/)
    const url = `https://www.footandanklecentre.co.uk/blog/${slug}/`
    assert.ok(html.includes(`<link rel="canonical" href="${url}"`))
    assert.ok(sitemap.includes(`<loc>${url}</loc>`))
    const json = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]
    assert.equal(JSON.parse(json).mainEntityOfPage, url)
  }
})
