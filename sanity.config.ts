import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './studio/schemaTypes'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || '8flspim8'
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'

export default defineConfig({
  name: 'foot-and-ankle-centre',
  title: 'Foot & Ankle Centre',
  projectId,
  dataset,
  plugins: [
    structureTool({
      name: 'default',
      title: 'Structure',
    }),
    visionTool(),
  ],
  schema: {
    types: schemaTypes,
  },
})
