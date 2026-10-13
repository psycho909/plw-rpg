import { createServer } from 'vite'
import { writeFile } from 'node:fs/promises'

const output = process.argv[2]
if (!output) throw new Error('Usage: node generate.mjs <output.json>')
const vite = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [], entries: [] },
  server: { middlewareMode: true },
  appType: 'custom',
})
try {
  const { CAVE_INSECT_CONTENT } = await vite.ssrLoadModule('/src/data/content/caveInsects.ts')
  await writeFile(output, JSON.stringify(CAVE_INSECT_CONTENT), { flag: 'wx' })
  process.stdout.write(`Generated compact CAVE_INSECT_CONTENT JSON: ${output}\n`)
} finally {
  await vite.close()
}
