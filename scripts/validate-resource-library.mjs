import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const root = path.resolve(process.cwd(), 'content/resources')
const allowedCategories = new Set([
  'Start Here',
  'Protein & Recovery',
  'Carbohydrates & Fiber',
  'Hydration & Caffeine',
  'Meal Planning',
  'Eating on the Go',
  'Performance Fueling',
  'Body Composition',
  'Women’s Health',
])
const files = fs.readdirSync(root).filter(file => file.endsWith('.md')).sort()
const errors = []
const slugs = new Set()
for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  const parsed = matter(source)
  const data = parsed.data
  const required = ['slug', 'title', 'summary', 'category', 'audience', 'sensitivity', 'readTimeMinutes', 'keywords', 'reviewedAt']
  for (const field of required) if (!data[field]) errors.push(`${file}: missing ${field}`)
  if (slugs.has(data.slug)) errors.push(`${file}: duplicate slug ${data.slug}`)
  slugs.add(data.slug)
  if (!allowedCategories.has(data.category)) errors.push(`${file}: unsupported category ${data.category}`)
  if (!['general', 'intentional_assignment'].includes(data.sensitivity)) errors.push(`${file}: unsupported sensitivity ${data.sensitivity}`)
  const keywordValues = Array.isArray(data.keywords)
    ? data.keywords
    : String(data.keywords || '').split(',').map(value => value.trim()).filter(Boolean)
  if (keywordValues.length < 2) errors.push(`${file}: keywords must contain at least two terms`)
  if (!/\[1\]/.test(parsed.content) || !/https?:\/\//.test(parsed.content)) errors.push(`${file}: expected references with URL citations`)
  const reviewedAt = data.reviewedAt instanceof Date
    ? data.reviewedAt.toISOString().slice(0, 10)
    : String(data.reviewedAt)
  if (!/^2026-09-\d{2}$/.test(reviewedAt)) errors.push(`${file}: invalid reviewedAt ${reviewedAt}`)
}
if (files.length !== 22) errors.push(`expected 22 articles, found ${files.length}`)
if (!files.some(file => file.includes('cycle-aware-fueling'))) errors.push('missing cycle-aware women’s resource')
if (!files.some(file => file.includes('perimenopause'))) errors.push('missing perimenopause resource')
if (!files.some(file => file.includes('muscle-bone'))) errors.push('missing muscle/bone midlife resource')
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`Resource Library validation passed: ${files.length} articles, ${slugs.size} unique slugs.`)
