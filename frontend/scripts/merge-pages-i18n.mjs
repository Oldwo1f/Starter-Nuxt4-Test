import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localesDir = path.join(__dirname, '..', 'i18n', 'locales')

function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target
  for (const key of Object.keys(source)) {
    const sv = source[key]
    const tv = target[key]
    if (
      sv &&
      typeof sv === 'object' &&
      !Array.isArray(sv) &&
      tv &&
      typeof tv === 'object' &&
      !Array.isArray(tv)
    ) {
      deepMerge(tv, sv)
    } else {
      target[key] = sv
    }
  }
  return target
}

const parts = ['pages-extra-part1.json', 'pages-extra-part2.json', 'pages-extra-part3.json']
let extra = {}
for (const name of parts) {
  const p = path.join(localesDir, name)
  if (!fs.existsSync(p)) continue
  deepMerge(extra, JSON.parse(fs.readFileSync(p, 'utf8')))
}

for (const file of ['fr.json', 'ty.json']) {
  const p = path.join(localesDir, file)
  const data = JSON.parse(fs.readFileSync(p, 'utf8'))
  deepMerge(data, extra)
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n')
}
