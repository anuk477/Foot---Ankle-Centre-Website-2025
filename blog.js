(function () {
  var config = window.FAC_SANITY || {}
  var projectId = config.projectId
  var dataset = config.dataset || 'production'
  var apiVersion = config.apiVersion || '2026-07-14'
  var useCdn = config.useCdn !== false
  var normalizedApiVersion = apiVersion.charAt(0) === 'v' ? apiVersion : 'v' + apiVersion
  var baseUrl = projectId && projectId !== 'YOUR_PROJECT_ID'
    ? 'https://' + projectId + '.api.sanity.io/' + normalizedApiVersion + '/data/query/' + dataset
    : ''

  var imageBase = projectId && projectId !== 'YOUR_PROJECT_ID'
    ? 'https://cdn.sanity.io/images/' + projectId + '/' + dataset + '/'
    : ''

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char]
    })
  }

  function formatDate(value) {
    if (!value) return ''
    return new Intl.DateTimeFormat('en-GB', {day: 'numeric', month: 'long', year: 'numeric'}).format(new Date(value))
  }

  function imageUrl(image) {
    if (!imageBase || !image || !image.asset || !image.asset._ref) return ''
    var parts = image.asset._ref.replace('image-', '').split('-')
    var extension = parts.pop()
    var dimensions = parts.pop()
    var id = parts.join('-')
    return imageBase + id + '-' + dimensions + '.' + extension + '?auto=format'
  }

  function fetchSanity(query, params) {
    if (!baseUrl) {
      return Promise.reject(new Error('Sanity is not configured yet. Add your projectId in sanity.public.config.js.'))
    }

    var url = new URL(baseUrl)
    url.searchParams.set('query', query)
    if (useCdn) url.searchParams.set('perspective', 'published')
    Object.keys(params || {}).forEach(function (key) {
      url.searchParams.set('$' + key, JSON.stringify(params[key]))
    })

    return fetch(url.toString()).then(function (response) {
      if (!response.ok) throw new Error('Sanity request failed.')
      return response.json()
    }).then(function (data) {
      return data.result
    })
  }

  function renderPortableText(blocks) {
    if (!Array.isArray(blocks) || !blocks.length) return ''

    var html = ''
    var openListType = ''

    function closeList() {
      if (!openListType) return
      html += openListType === 'number' ? '</ol>' : '</ul>'
      openListType = ''
    }

    function renderText(block) {
      return (block.children || []).map(function (child) {
        return escapeHtml(child.text)
      }).join('')
    }

    blocks.forEach(function (block) {
      if (block._type === 'image') {
        closeList()
        var src = imageUrl(block)
        if (!src) return
        html += '<figure><img src="' + src + '" alt="' + escapeHtml(block.alt) + '" loading="lazy"></figure>'
        return
      }

      if (block._type !== 'block') return

      var text = renderText(block)
      if (!text) return

      if (block.listItem) {
        if (openListType && openListType !== block.listItem) closeList()
        if (!openListType) {
          html += block.listItem === 'number' ? '<ol>' : '<ul>'
          openListType = block.listItem
        }
        html += '<li>' + text + '</li>'
        return
      }

      closeList()
      if (block.style === 'h2') html += '<h2>' + text + '</h2>'
      else if (block.style === 'h3') html += '<h3>' + text + '</h3>'
      else if (block.style === 'blockquote') html += '<blockquote>' + text + '</blockquote>'
      else html += '<p>' + text + '</p>'
    })

    closeList()
    return html
  }

  function renderList() {
    var target = document.querySelector('[data-blog-list]')
    if (!target) return

    var limit = Number(target.getAttribute('data-blog-limit') || 0)
    var linkPrefix = target.getAttribute('data-blog-link-prefix') || ''
    var query = '*[_type == "post" && defined(slug.current)] | order(publishedAt desc){title, slug, excerpt, publishedAt, mainImage, author->{name}, categories[]->{title}}'
    fetchSanity(query).then(function (posts) {
      if (limit > 0) posts = posts.slice(0, limit)

      if (!posts.length) {
        target.innerHTML = '<p class="blog-status">No posts have been published yet.</p>'
        return
      }

      target.innerHTML = posts.map(function (post) {
        var img = imageUrl(post.mainImage)
        var categories = (post.categories || []).map(function (category) {
          return '<span>' + escapeHtml(category.title) + '</span>'
        }).join('')

        var href = linkPrefix + encodeURIComponent(post.slug.current) + '/'

        return [
          '<article class="blog-card">',
          img ? '<img src="' + img + '" alt="' + escapeHtml(post.mainImage.alt || post.title) + '" loading="lazy">' : '',
          '<div class="blog-card-body">',
          '<div class="blog-meta">' + escapeHtml(formatDate(post.publishedAt)) + (post.author && post.author.name ? ' by ' + escapeHtml(post.author.name) : '') + '</div>',
          '<h3><a href="' + href + '">' + escapeHtml(post.title) + '</a></h3>',
          post.excerpt ? '<p>' + escapeHtml(post.excerpt) + '</p>' : '',
          categories ? '<div class="blog-tags">' + categories + '</div>' : '',
          '</div>',
          '<a class="stretched-link" href="' + href + '" aria-label="Read ' + escapeHtml(post.title) + '"></a>',
          '</article>'
        ].join('')
      }).join('')
    }).catch(function (error) {
      target.innerHTML = '<p class="blog-status">' + escapeHtml(error.message) + '</p>'
    })
  }

  function renderPost() {
    var target = document.querySelector('[data-blog-post] #blog-post')
    if (!target) return

    var slug = new URLSearchParams(window.location.search).get('slug')
    if (!slug) {
      target.innerHTML = '<p class="blog-status">No blog post was selected.</p>'
      return
    }

    var query = '*[_type == "post" && slug.current == $slug][0]{title, excerpt, publishedAt, mainImage, body, seoTitle, seoDescription, author->{name, role}, categories[]->{title}}'
    fetchSanity(query, {slug: slug}).then(function (post) {
      if (!post) {
        target.innerHTML = '<p class="blog-status">This post could not be found.</p>'
        return
      }

      var title = post.seoTitle || post.title
      var description = post.seoDescription || post.excerpt
      document.title = title + ' | Foot & Ankle Centre'
      if (description) {
        var meta = document.querySelector('meta[name="description"]')
        if (meta) meta.setAttribute('content', description)
      }

      var img = imageUrl(post.mainImage)
      var categories = (post.categories || []).map(function (category) {
        return '<span>' + escapeHtml(category.title) + '</span>'
      }).join('')

      target.innerHTML = [
        categories ? '<div class="blog-tags">' + categories + '</div>' : '',
        '<h1>' + escapeHtml(post.title) + '</h1>',
        '<div class="blog-meta">' + escapeHtml(formatDate(post.publishedAt)) + (post.author && post.author.name ? ' by ' + escapeHtml(post.author.name) : '') + '</div>',
        post.excerpt ? '<p class="blog-intro">' + escapeHtml(post.excerpt) + '</p>' : '',
        img ? '<figure class="blog-main-image"><img src="' + img + '" alt="' + escapeHtml(post.mainImage.alt || post.title) + '"></figure>' : '',
        '<div class="blog-content">' + renderPortableText(post.body) + '</div>'
      ].join('')
    }).catch(function (error) {
      target.innerHTML = '<p class="blog-status">' + escapeHtml(error.message) + '</p>'
    })
  }

  function renderPostSidebar() {
    var target = document.querySelector('[data-blog-sidebar]')
    if (!target) return

    var slug = new URLSearchParams(window.location.search).get('slug')
    var query = '*[_type == "post" && defined(slug.current)] | order(publishedAt desc)[0...8]{title, slug}'

    fetchSanity(query).then(function (posts) {
      posts = (posts || []).filter(function (post) {
        return post.slug && post.slug.current && post.slug.current !== slug
      }).slice(0, 6)

      if (!posts.length) {
        target.innerHTML = '<p class="blog-status">No other posts have been published yet.</p>'
        return
      }

      target.innerHTML = '<ul class="blog-sidebar-list">' + posts.map(function (post) {
        var href = encodeURIComponent(post.slug.current) + '/'
        return '<li><a href="' + href + '">' + escapeHtml(post.title) + '</a></li>'
      }).join('') + '</ul>'
    }).catch(function (error) {
      target.innerHTML = '<p class="blog-status">' + escapeHtml(error.message) + '</p>'
    })
  }

  function setYear() {
    var year = document.getElementById('year')
    if (year) year.textContent = new Date().getFullYear()
  }

  setYear()
  renderList()
  renderPost()
  renderPostSidebar()
})()
