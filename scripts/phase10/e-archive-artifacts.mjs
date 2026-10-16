import { createHash } from 'node:crypto'
import { gzipSync, gunzipSync } from 'node:zlib'
import { readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.join(process.cwd(), 'reports/v2/20261016-final-qa-rc/phase-10/e-runner')
const threshold = 256 * 1024
const records = []
const sha = value => createHash('sha256').update(value).digest('hex')

async function visit(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await visit(file)
      continue
    }
    if (entry.name.endsWith('.gz') || entry.name === 'artifact-sha256.json') continue
    const info = await stat(file)
    if (info.size <= threshold) continue
    const raw = await readFile(file)
    const compressed = gzipSync(raw, { level: 9 })
    if (sha(gunzipSync(compressed)) !== sha(raw)) throw new Error(`gzip round-trip failed: ${file}`)
    const archive = `${file}.gz`
    await writeFile(archive, compressed, { flag: 'wx' })
    await unlink(file)
    records.push({
      file: path.relative(root, archive).replaceAll('\\', '/'),
      bytes: compressed.byteLength,
      sha256: sha(compressed),
      rawBytes: raw.byteLength,
      rawSha256: sha(raw),
      archived: true,
      roundTripVerified: true,
    })
  }
}

await visit(root)
await writeFile(path.join(root, 'e-artifact-sha256.json'), `${JSON.stringify(records, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify({ archived: records.length, records }))
