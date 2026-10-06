const fs = require('fs')
const path = require('path')
const vm = require('vm')

const rootDir = path.resolve(__dirname, '..')
const siteUrl = 'https://www.footandanklecentre.co.uk'
const generatedMarker = '.generated-blog-post'

function readText(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), 'utf8')
}

function writeText(filePath, content) {
  const absolutePath = path.join(rootDir, filePath)
  fs.mkdirSync(path.dirname(absolutePath), {recursive: true})
  fs.writeFileSync(absolutePath, content, 'utf8')
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, function (char) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]
  })
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;')
}

function escapeXml(value) {
  return String(value || '').replace(/[<>&'"]/g, function (char) {
    return {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      "'": '&apos;',
      '"': '&quot;',
    }[char]
  })
}

function canonicalUrl(value) {
  return String(value || '')
    .replace(/^http:\/\/footandanklecentre\.co\.uk/i, siteUrl)
    .replace(/^https:\/\/footandanklecentre\.co\.uk/i, siteUrl)
    .replace(/^http:\/\/www\.footandanklecentre\.co\.uk/i, siteUrl)
}

function formatDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

function dateOnly(value) {
  if (!value) return new Date().toISOString().slice(0, 10)
  return new Date(value).toISOString().slice(0, 10)
}

function getConfig() {
  const sandbox = {window: {}}
  vm.createContext(sandbox)
  vm.runInContext(readText('sanity.public.config.js'), sandbox)
  return sandbox.window.FAC_SANITY
}

function imageUrl(projectId, dataset, image) {
  if (!projectId || !dataset || !image || !image.asset || !image.asset._ref) return ''
  const parts = image.asset._ref.replace('image-', '').split('-')
  const extension = parts.pop()
  const dimensions = parts.pop()
  const id = parts.join('-')
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${dimensions}.${extension}?auto=format`
}

function spanText(child, markDefs) {
  let text = escapeHtml(child.text)
  ;(child.marks || []).forEach(function (mark) {
    if (mark === 'strong') text = `<strong>${text}</strong>`
    else if (mark === 'em') text = `<em>${text}</em>`
    else {
      const definition = markDefs.find(function (item) {
        return item._key === mark
      })
      if (definition && definition._type === 'link' && definition.href) {
        const href = escapeAttribute(definition.href)
        const isExternal = !definition.href.startsWith('/') && !definition.href.startsWith(siteUrl)
        const rel = isExternal ? ' rel="noopener noreferrer"' : ''
        text = `<a href="${href}"${rel}>${text}</a>`
      }
    }
  })
  return text
}

function blockText(block) {
  return (block.children || []).map(function (child) {
    return child.text || ''
  }).join('')
}

function portableTextToPlainText(blocks) {
  return (blocks || []).map(function (block) {
    if (block._type !== 'block') return ''
    return blockText(block)
  }).filter(Boolean).join(' ')
}

function renderPortableText(blocks, projectId, dataset) {
  if (!Array.isArray(blocks) || !blocks.length) return ''

  let html = ''
  let openListType = ''

  function closeList() {
    if (!openListType) return
    html += openListType === 'number' ? '</ol>' : '</ul>'
    openListType = ''
  }

  blocks.forEach(function (block) {
    if (block._type === 'image') {
      closeList()
      const src = imageUrl(projectId, dataset, block)
      if (!src) return
      html += `<figure><img src="${escapeAttribute(src)}" alt="${escapeAttribute(block.alt)}" loading="lazy"></figure>`
      return
    }

    if (block._type !== 'block') return

    const markDefs = block.markDefs || []
    const text = (block.children || []).map(function (child) {
      return spanText(child, markDefs)
    }).join('')
    if (!text) return

    if (block.listItem) {
      if (openListType && openListType !== block.listItem) closeList()
      if (!openListType) {
        html += block.listItem === 'number' ? '<ol>' : '<ul>'
        openListType = block.listItem
      }
      html += `<li>${text}</li>`
      return
    }

    closeList()
    if (block.style === 'h2') html += `<h2>${text}</h2>`
    else if (block.style === 'h3') html += `<h3>${text}</h3>`
    else if (block.style === 'blockquote') html += `<blockquote>${text}</blockquote>`
    else html += `<p>${text}</p>`
  })

  closeList()
  return html
}

function truncate(value, length) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (text.length <= length) return text
  return text.slice(0, length - 1).trimEnd() + '…'
}

function renderTags(categories) {
  const tags = (categories || []).map(function (category) {
    return category && category.title ? `<span>${escapeHtml(category.title)}</span>` : ''
  }).join('')
  return tags ? `<div class="blog-tags">${tags}</div>` : ''
}

function renderCards(posts, projectId, dataset) {
  if (!posts.length) return '<p class="blog-status">No posts have been published yet.</p>'
  return posts.map(function (post) {
    const image = imageUrl(projectId, dataset, post.mainImage)
    const href = `/blog/${post.slug.current}/`
    const author = post.author && post.author.name ? ` by ${escapeHtml(post.author.name)}` : ''
    return `<article class="blog-card">
      ${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(post.mainImage.alt || post.title)}" loading="lazy">` : ''}
      <div class="blog-card-body">
        <div class="blog-meta">${escapeHtml(formatDate(post.publishedAt))}${author}</div>
        <h3><a href="${href}">${escapeHtml(post.title)}</a></h3>
        ${post.excerpt ? `<p>${escapeHtml(post.excerpt)}</p>` : ''}
        ${renderTags(post.categories)}
      </div>
      <a class="stretched-link" href="${href}" aria-label="Read ${escapeAttribute(post.title)}"></a>
    </article>`
  }).join('\n')
}

function listingTemplate(template, posts, projectId, dataset) {
  const start = '<!-- generated-blog-list:start -->'
  const end = '<!-- generated-blog-list:end -->'
  const content = `${start}\n${renderCards(posts, projectId, dataset)}\n${end}`
  if (template.includes(start) && template.includes(end)) {
    template = template.replace(/<!-- generated-blog-list:start -->[\s\S]*?<!-- generated-blog-list:end -->/, () => content)
  } else {
    const placeholder = /(<div\b[^>]*\bdata-blog-list[^>]*>)\s*<p class="blog-status">Loading posts\.\.\.<\/p>/
    if (!placeholder.test(template)) throw new Error('Missing generated blog listing markers; refusing to publish stale links.')
    template = template.replace(placeholder, (_, opening) => `${opening}\n${content}`)
  }
  return template
    .replace(/\s*<script(?: defer)? src="(?:\.\.\/)?(?:sanity\.public\.config\.js|blog\.js\?v=[^"]+)"><\/script>/g, '')
    .replace(/ data-blog-list\b/g, '')
    .replace(/ data-blog-(?:limit|link-prefix)="[^"]*"/g, '')
}

function validatePosts(posts) {
  if (!Array.isArray(posts)) throw new Error('Sanity returned an invalid posts response.')
  const slugs = new Set()
  posts.forEach(function (post) {
    const slug = post.slug && post.slug.current
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || '') || /^(index|post|con|prn|aux|nul|com[0-9]|lpt[0-9])$/.test(slug)) {
      throw new Error(`Invalid blog slug: ${slug}`)
    }
    if (slugs.has(slug)) throw new Error(`Duplicate blog slug: ${slug}`)
    slugs.add(slug)
  })
  return slugs
}

function renderSidebar(posts, currentSlug) {
  const links = posts.filter(function (post) {
    return post.slug.current !== currentSlug
  }).slice(0, 6).map(function (post) {
    return `<li><a href="../${escapeAttribute(post.slug.current)}/">${escapeHtml(post.title)}</a></li>`
  }).join('')

  if (!links) return '<p class="blog-status">No other posts have been published yet.</p>'
  return `<ul class="blog-sidebar-list">${links}</ul>`
}

function renderJsonLd(post, url, image, description) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description,
    datePublished: post.publishedAt,
    dateModified: post._updatedAt || post.publishedAt,
    author: {
      '@type': 'Person',
      name: post.author && post.author.name ? post.author.name : 'Foot & Ankle Centre',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Foot & Ankle Centre',
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/images/fac%20logo%20blue.avif`,
      },
    },
    mainEntityOfPage: url,
  }

  if (image) data.image = image
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

function buildHead(post, url, image, description) {
  const title = `${post.seoTitle || post.title} | Foot & Ankle Centre`
  return `<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeAttribute(description)}" />
  <link rel="canonical" href="${escapeAttribute(url)}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeAttribute(title)}" />
  <meta property="og:description" content="${escapeAttribute(description)}" />
  <meta property="og:url" content="${escapeAttribute(url)}" />
  ${image ? `<meta property="og:image" content="${escapeAttribute(image)}" />` : ''}
  <link rel="icon" type="image/jpeg" href="../../images/fac logo blue.avif" />
  <link rel="stylesheet" href="../../styles.css?v=1.0.8" />
  <script type="application/ld+json">${renderJsonLd(post, url, image, description)}</script>
</head>`
}

function buildMain(post, posts, projectId, dataset) {
  const image = imageUrl(projectId, dataset, post.mainImage)
  const content = renderPortableText(post.body, projectId, dataset)
  const sidebar = renderSidebar(posts, post.slug.current)
  const categories = renderTags(post.categories)
  const author = post.author && post.author.name ? ` by ${escapeHtml(post.author.name)}` : ''

  return `<main id="main">
    <article class="blog-article">
      <div class="container blog-post-layout">
        <aside class="blog-sidebar" aria-labelledby="blog-sidebar-heading">
          <h2 id="blog-sidebar-heading">Other posts</h2>
          <nav aria-label="Other blog posts">
            ${sidebar}
          </nav>
        </aside>
        <div id="blog-post" class="blog-post">
          ${categories}
          <h1>${escapeHtml(post.title)}</h1>
          <div class="blog-meta">${escapeHtml(formatDate(post.publishedAt))}${author}</div>
          ${post.excerpt ? `<p class="blog-intro">${escapeHtml(post.excerpt)}</p>` : ''}
          ${image ? `<figure class="blog-main-image"><img src="${escapeAttribute(image)}" alt="${escapeAttribute((post.mainImage && post.mainImage.alt) || post.title)}"></figure>` : ''}
          <div class="blog-content">${content}</div>
        </div>
      </div>
    </article>
  </main>`
}

function pageTemplate(post, posts, projectId, dataset) {
  const template = readText('blog/post.html')
    .replace(/\.\.\//g, '../../')
    .replace(/href="\.\//g, 'href="../../blog/')
    .replace(/\s*<script src="\.\.\/\.\.\/sanity\.public\.config\.js"><\/script>\s*/g, '\n')
    .replace(/\s*<script defer src="\.\.\/\.\.\/blog\.js\?v=[^"]+"><\/script>\s*/g, '\n')

  const url = `${siteUrl}/blog/${post.slug.current}/`
  const image = imageUrl(projectId, dataset, post.mainImage)
  const description = truncate(post.seoDescription || post.excerpt || portableTextToPlainText(post.body), 160)

  return template
    .replace(/<head>[\s\S]*?<\/head>/, () => buildHead(post, url, image, description))
    .replace(/<main id="main">[\s\S]*?<\/main>/, () => buildMain(post, posts, projectId, dataset))
}

async function fetchPosts(config) {
  const projectId = config.projectId
  const dataset = config.dataset || 'production'
  const apiVersion = (config.apiVersion || '2026-07-14').replace(/^v/, '')
  const query = `*[_type == "post" && defined(slug.current)] | order(publishedAt desc){
    _id,
    _updatedAt,
    title,
    slug,
    excerpt,
    publishedAt,
    mainImage,
    body,
    seoTitle,
    seoDescription,
    author->{name, role},
    categories[]->{title}
  }`
  const url = new URL(`https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}`)
  url.searchParams.set('query', query)
  url.searchParams.set('perspective', 'published')

  const response = await fetch(url, {signal: AbortSignal.timeout(30000)})
  if (!response.ok) throw new Error(`Sanity request failed: ${response.status}`)
  const data = await response.json()
  if (!Array.isArray(data.result)) throw new Error('Sanity response is missing its posts array.')
  return data.result
}

function updateSitemap(posts) {
  const sitemapPath = path.join(rootDir, 'sitemap.xml')
  const sitemap = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, 'utf8') : ''
  const locMatches = Array.from(sitemap.matchAll(/<url><loc>(.*?)<\/loc><lastmod>(.*?)<\/lastmod><changefreq>(.*?)<\/changefreq><priority>(.*?)<\/priority><\/url>/g))

  const urls = locMatches.map(function (match) {
    return {
      loc: canonicalUrl(match[1]),
      lastmod: match[2],
      changefreq: match[3],
      priority: match[4],
    }
  }).filter(function (item) {
    return !item.loc.startsWith(`${siteUrl}/blog/post`) && !/^https:\/\/www\.footandanklecentre\.co\.uk\/blog\/[^/]+\/$/.test(item.loc)
  })

  posts.forEach(function (post) {
    urls.push({
      loc: `${siteUrl}/blog/${post.slug.current}/`,
      lastmod: dateOnly(post._updatedAt || post.publishedAt),
      changefreq: 'weekly',
      priority: '0.7',
    })
  })

  const body = urls.map(function (item) {
    return `  <url><loc>${escapeXml(item.loc)}</loc><lastmod>${escapeXml(item.lastmod)}</lastmod><changefreq>${escapeXml(item.changefreq)}</changefreq><priority>${escapeXml(item.priority)}</priority></url>`
  }).join('\n')

  writeText('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`)
}

function cleanStalePosts(currentSlugs) {
  const blogDir = path.join(rootDir, 'blog')
  if (!fs.existsSync(blogDir)) return

  fs.readdirSync(blogDir, {withFileTypes: true}).forEach(function (entry) {
    if (!entry.isDirectory()) return
    if (entry.isSymbolicLink()) return
    const dir = path.resolve(blogDir, entry.name)
    if (path.dirname(dir) !== blogDir) throw new Error('Refusing cleanup outside the blog directory.')
    const marker = path.join(dir, generatedMarker)
    if (fs.existsSync(marker) && !currentSlugs.has(entry.name)) {
      fs.rmSync(dir, {recursive: true, force: true})
    }
  })
}

async function main() {
  const config = getConfig()
  const posts = await fetchPosts(config)
  const projectId = config.projectId
  const dataset = config.dataset || 'production'
  const slugs = validatePosts(posts)
  // Render every page before changing files, so malformed content fails the build early.
  const pages = posts.map(post => ({slug: post.slug.current, html: pageTemplate(post, posts, projectId, dataset)}))
  const blogIndex = listingTemplate(readText('blog/index.html'), posts, projectId, dataset)
  const homeIndex = listingTemplate(readText('index.html'), posts.slice(0, 3), projectId, dataset)
  pages.forEach(function (page) {
    writeText(path.join('blog', page.slug, 'index.html'), page.html)
    writeText(path.join('blog', page.slug, generatedMarker), 'Generated by scripts/generate-blog.js\n')
  })
  writeText('blog/index.html', blogIndex)
  writeText('index.html', homeIndex)
  updateSitemap(posts)
  cleanStalePosts(slugs)
  console.log(`Generated ${posts.length} blog post page${posts.length === 1 ? '' : 's'}.`)
}

if (require.main === module) main().catch(function (error) {
  console.error(error)
  process.exit(1)
})

module.exports = {listingTemplate, validatePosts, pageTemplate, renderPortableText}
