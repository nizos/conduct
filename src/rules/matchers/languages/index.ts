import path from 'node:path'

import { javascript } from './javascript.js'
import { typescript } from './typescript.js'

export function inferLanguage(filePath: string) {
  const ext = path.extname(filePath)
  if (ext === '.ts' || ext === '.tsx') return typescript
  if (ext === '.js') return javascript
  return undefined
}
