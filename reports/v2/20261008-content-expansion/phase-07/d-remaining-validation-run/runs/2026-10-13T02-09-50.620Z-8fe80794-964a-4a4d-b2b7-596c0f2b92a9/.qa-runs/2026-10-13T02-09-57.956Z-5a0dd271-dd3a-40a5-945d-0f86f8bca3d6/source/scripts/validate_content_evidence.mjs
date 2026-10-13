import { createHash, randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')

async function contentModulePaths(root) {
  const directory = join(root, 'src/data/content')
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true })
    const nested = await Promise.all(entries.map(entry => entry.isDirectory()
      ? walk(join(current, entry.name))
      : entry.isFile() && entry.name.endsWith('.ts') ? [relative(root, join(current, entry.name))] : []))
    return nested.flat()
  }
  try {
    return (await walk(directory)).sort()
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

export function runCheck(command, args, options = {}) {
  const child = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, ...options })
  const errorText = child.error ? `${child.error.name}: ${child.error.message}` : ''
  return {
    command, args, stdout: child.stdout ?? '', stderr: child.stderr ?? '',
    exitCode: child.status, signal: child.signal, error: errorText,
    status: child.error || child.status !== 0 || child.signal ? 'FAIL' : 'PASS',
  }
}

export function aggregateStatus(contentValidationStatus, checks, runErrors = []) {
  return contentValidationStatus === 'PASS' && runErrors.length === 0 && Object.values(checks).every(check => check.status === 'PASS')
    ? 'PASS'
    : 'FAIL'
}

export async function captureRunEvidence({ root = process.cwd(), packPath, reportDirectory, sourcePaths = [] }) {
  root = resolve(root)
  packPath = resolve(root, packPath)
  // Capture the supplied bytes before any parser or validator sees them.
  const packBytes = await readFile(packPath)
  const base = resolve(root, reportDirectory)
  const runsDirectory = join(base, '.qa-runs')
  await mkdir(runsDirectory, { recursive: true })
  const directory = join(runsDirectory, `${new Date().toISOString().replaceAll(':', '-')}-${randomUUID()}`)
  await mkdir(directory)
  const inputDirectory = join(directory, 'input')
  const sourceDirectory = join(directory, 'source')
  await mkdir(inputDirectory)
  await mkdir(sourceDirectory)
  await writeFile(join(inputDirectory, basename(packPath)), packBytes, { flag: 'wx', flush: true })

  const allSourcePaths = [...new Set([...sourcePaths, ...await contentModulePaths(root)])].sort()
  const files = {}
  for (const sourcePath of allSourcePaths) {
    const absolute = resolve(root, sourcePath)
    const bytes = await readFile(absolute)
    const target = join(sourceDirectory, sourcePath)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, bytes, { flag: 'wx', flush: true })
    files[sourcePath.split(sep).join('/')] = { sha256: sha256(bytes), snapshot: relative(directory, target).split(sep).join('/') }
  }
  const headResult = runCheck('git', ['rev-parse', 'HEAD'], { cwd: root })
  const branchResult = runCheck('git', ['branch', '--show-current'], { cwd: root })
  if (headResult.status !== 'PASS' || branchResult.status !== 'PASS') throw new Error('Unable to capture actual Git HEAD and branch')
  const sourceFingerprint = sha256(Buffer.from(JSON.stringify(Object.fromEntries(Object.entries(files).map(([path, file]) => [path, file.sha256])))))
  const manifest = {
    version: 1,
    capturedAt: new Date().toISOString(),
    git: { head: headResult.stdout.trim(), branch: branchResult.stdout.trim() },
    input: { originalPath: relative(root, packPath), snapshot: `input/${basename(packPath)}`, bytes: packBytes.length, sha256: sha256(packBytes) },
    pack: { bytes: packBytes.length, sha256: sha256(packBytes) },
    sourceFingerprintAlgorithm: 'SHA-256 over compact JSON mapping sorted source paths to their SHA-256 values',
    sourceFingerprint,
    runtime: { node: process.version, platform: process.platform, architecture: process.arch },
    sourceFiles: files,
    provenance: 'Input and source files are independent run-time captures; this manifest does not claim that the captured source generated the supplied pack.',
  }
  await writeFile(join(directory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx', flush: true })
  return { directory, manifest, packBytes }
}

export async function writeRunArtifact(runDirectory, name, value) {
  const target = join(runDirectory, name)
  await writeFile(target, value, { flag: 'wx', flush: true })
  return target
}
