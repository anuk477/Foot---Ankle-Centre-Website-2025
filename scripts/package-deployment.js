'use strict'

const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const output = path.join(root, 'dist')

const rootFiles = [
  '.htaccess',
  '404.html',
  'ads.txt',
  'booking.html',
  'blog.js',
  'index.html',
  'llms.txt',
  'mobile-menu-canonical.html',
  'robots.txt',
  'sitemap.xml',
  'script.js',
  'styles.css',
  '_lambda.zip',
]

const runtimeDirectories = [
  '_lambda',
  'api',
  'assistant',
  'blog',
  'fonts',
  'images',
  'insurance',
  'knowledge-base',
  'outlook-addin-v6',
  'prices',
  'procedures',
  'success',
  'videos',
]

function copyTree(source, destination, relativePath) {
  const stat = fs.statSync(source)
  if (stat.isDirectory()) {
    fs.mkdirSync(destination, {recursive: true})
    for (const entry of fs.readdirSync(source, {withFileTypes: true})) {
      const childRelative = path.join(relativePath, entry.name)
      if (entry.name === '.generated-blog-post' || entry.name === '.git') continue
      if (entry.name === 'README.txt' || entry.name === 'SETUP.md' || entry.name === 'README.md') continue
      if (entry.name.endsWith('.xmp')) continue
      if (entry.isFile() && entry.name.endsWith('.md') && !childRelative.startsWith(`knowledge-base${path.sep}`)) continue
      copyTree(path.join(source, entry.name), path.join(destination, entry.name), childRelative)
    }
    return
  }

  fs.mkdirSync(path.dirname(destination), {recursive: true})
  fs.copyFileSync(source, destination)
}

fs.rmSync(output, {recursive: true, force: true})
fs.mkdirSync(output, {recursive: true})

for (const file of rootFiles) {
  const source = path.join(root, file)
  if (!fs.existsSync(source)) throw new Error(`Required website file is missing: ${file}`)
  copyTree(source, path.join(output, file), file)
}

for (const directory of runtimeDirectories) {
  const source = path.join(root, directory)
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
    throw new Error(`Required website directory is missing: ${directory}`)
  }
  copyTree(source, path.join(output, directory), directory)
}

console.log('Prepared the IONOS package in dist from the website runtime files.')
