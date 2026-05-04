import path from 'node:path'

import { csharp } from './csharp.js'
import { javascript } from './javascript.js'
import { python } from './python.js'
import { typescript } from './typescript.js'

export function inferLanguage(filePath: string) {
  const ext = path.extname(filePath)
  if (ext === '.ts' || ext === '.tsx') return typescript
  if (ext === '.js') return javascript
  if (ext === '.py') return python
  if (ext === '.cs') return csharp
  return undefined
}
