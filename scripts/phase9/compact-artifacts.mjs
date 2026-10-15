import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { readdir, readFile, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve('reports/v2/20261015-ui-ux-polish/phase-09/a-runner')
const limit = 256 * 1024
const hash = data => createHash('sha256').update(data).digest('hex')
const dirs = (await readdir(root, { withFileTypes: true })).filter(item => item.isDirectory() && item.name.startsWith('attempt-'))
const compacted = []
for (const attempt of dirs) {
  const base = path.join(root, attempt.name)
  const entries = []
  async function walk(dir) {
    for (const item of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, item.name)
      if (item.isDirectory()) { await walk(file); continue }
      if (item.name.endsWith('.gz') || item.name.endsWith('.png') || item.name === 'sha256-manifest.json') continue
      const bytes = await readFile(file)
      if (bytes.length <= limit) continue
      const compressed = gzipSync(bytes, { level: 9 })
      const output = `${file}.gz`
      await writeFile(output, compressed, { flag: 'wx' })
      await rm(file)
      entries.push({ path: path.relative(base, file).replaceAll('\\', '/'), gzipPath: `${path.relative(base, output).replaceAll('\\', '/')}`, originalBytes: bytes.length, gzipBytes: compressed.length, sha256Original: hash(bytes), sha256Gzip: hash(compressed) })
    }
  }
  await walk(base)
  if (entries.length) {
    const manifestPath = path.join(base, 'sha256-manifest.json')
    const prior = await readFile(manifestPath, 'utf8').catch(() => '')
    const merged = prior ? JSON.parse(prior) : { policy: 'raw files over 256 KiB losslessly gzip-compressed; original and gzip SHA-256 retained', files: [] }
    merged.files.push(...entries)
    await writeFile(manifestPath, `${JSON.stringify(merged, null, 2)}\n`, { flag: prior ? 'w' : 'wx' })
    compacted.push({ attempt: attempt.name, entries })
  }
}
console.log(JSON.stringify({ attemptsScanned: dirs.length, compacted }))
