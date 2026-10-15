'use strict'

const fs = require('node:fs')
const path = require('node:path')

function outlookStatusConfig(root) {
  const secret = process.env.OUTLOOK_STATUS_SECRET
  if (secret) {
    // Base64 avoids PHP quoting/interpolation issues. This file is server-side only.
    return `<?php\nreturn base64_decode('${Buffer.from(secret, 'utf8').toString('base64')}');\n`
  }
  const localConfig = path.join(root, 'outlook-addin-v6', 'status-config.php')
  if (!process.env.CI && fs.existsSync(localConfig)) return fs.readFileSync(localConfig, 'utf8')
  throw new Error('Set the OUTLOOK_STATUS_SECRET GitHub Actions secret before deploying the Outlook add-in.')
}

module.exports = {outlookStatusConfig}
