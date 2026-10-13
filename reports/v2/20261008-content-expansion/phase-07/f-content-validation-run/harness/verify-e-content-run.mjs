import { createHash } from 'node:crypto'
import { inflateSync } from 'node:zlib'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const runDirectory = resolve(process.argv[2] ?? '')
if (!process.argv[2]) throw new Error('Usage: node verify-e-content-run.mjs <run-directory>')
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const parse = async path => JSON.parse(await readFile(path, 'utf8'))
const names = ['slime', 'cave-insects', 'wild-beasts', 'frontier-goblins', 'fog-undead', 'mine-constructs', 'six-family-combined']
const before = await parse(join(runDirectory, 'artifacts/before.json'))
const after = await parse(join(runDirectory, 'artifacts/after.json'))
const extraction = await parse(join(runDirectory, 'packs/extraction-manifest.json'))
const baselinePath = 'reports/v2/20261008-content-expansion/phase-07/content-baseline.json'
const baselineCurrentSha = sha(await readFile(join(resolve(runDirectory, '../../../../../../../'), baselinePath)))
const cases = []
for (const name of names) {
  const generated = await readFile(join(runDirectory, 'packs', `${name}.json`))
  const generatedSha = sha(generated)
  const runResult = await parse(join(runDirectory, 'artifacts', `validate-${name}.result.json`))
  const outputDir = join(runDirectory, 'cases', name)
  const runDirs = await readdir(join(outputDir, '.qa-runs'))
  const valid = runDirs.length === 1
  const evidenceDir = join(outputDir, '.qa-runs', runDirs[0] ?? '')
  const manifest = valid ? await parse(join(evidenceDir, 'manifest.json')) : null
  const outcome = valid ? await parse(join(evidenceDir, 'outcome.json')) : null
  const publisher = valid ? await parse(join(evidenceDir, 'report-publish.status.json')) : null
  const inputBytes = valid ? await readFile(join(evidenceDir, manifest.input.snapshot)) : Buffer.alloc(0)
  const mapFingerprint = manifest ? sha(Buffer.from(JSON.stringify(Object.fromEntries(Object.entries(manifest.sourceFiles).map(([path, record]) => [path, record.sha256]))))) : null
  const sourceMismatches = []
  if (manifest) for (const [path, record] of Object.entries(manifest.sourceFiles)) {
    const bytes = await readFile(join(evidenceDir, record.snapshot))
    if (sha(bytes) !== record.sha256 || (before.sha256[path] !== undefined && before.sha256[path] !== record.sha256) || (after.sha256[path] !== undefined && after.sha256[path] !== record.sha256)) sourceMismatches.push(path)
  }
  const baselineCapture = manifest?.sourceFiles?.[baselinePath]
  const baselineSnapshotSha = baselineCapture ? sha(await readFile(join(evidenceDir, baselineCapture.snapshot))) : null
  const stdout = await readFile(join(runDirectory, 'artifacts', `validate-${name}.stdout.txt`), 'utf8')
  const stderr = await readFile(join(runDirectory, 'artifacts', `validate-${name}.stderr.txt`), 'utf8')
  const report = await readFile(join(outputDir, 'readable-report.md'), 'utf8')
  const expectedTests = 21
  const testsPass = new RegExp(`Tests\\s+${expectedTests} passed \\(${expectedTests}\\)`).test(report)
  const typecheckPass = outcome?.checks?.typecheck?.status === 'PASS' && outcome.checks.typecheck.exitCode === 0
  const archivedSummary = null
  const errors = report.split('\n').filter(line => line.startsWith('- ERROR '))
  const warnings = report.split('\n').filter(line => line.startsWith('- WARNING '))
  const expectedCliExit = outcome?.overallStatus === 'PASS' ? 0 : 1
  cases.push({
    name, cliExit: runResult.exitCode, cliSignal: runResult.signal, cliSpawnError: runResult.error,
    commandStdoutBytes: Buffer.byteLength(stdout), commandStderrBytes: Buffer.byteLength(stderr),
    generatedBytes: generated.length, generatedSha256: generatedSha,
    generatedMatchesExtractionManifest: extraction.packArtifacts[name]?.sha256 === generatedSha && extraction.packArtifacts[name]?.bytes === generated.length,
    generatedMatchesExtractionManifest: extraction.packArtifacts[name]?.sha256 === generatedSha && extraction.packArtifacts[name]?.bytes === generated.length,
    qaRunCount: runDirs.length,
    capturedInputMatchesGenerated: manifest?.input?.sha256 === generatedSha && sha(inputBytes) === generatedSha,
    capturedSourceFingerprint: manifest?.sourceFingerprint ?? null,
    recomputedSourceFingerprintMatches: manifest?.sourceFingerprint === mapFingerprint,
    capturedSourceMismatches: sourceMismatches,
    baselineInputShaAtRun: baselineCapture?.sha256 ?? null,
    baselineInputSnapshotMatches: Boolean(baselineCapture && baselineSnapshotSha === baselineCapture.sha256),
    baselineInputStillSame: Boolean(baselineCapture && baselineCapture.sha256 === baselineCurrentSha),
    contentStatus: outcome?.contentValidationStatus ?? null, overallStatus: outcome?.overallStatus ?? null,
    expectedCliExit, cliExitMatchesOutcome: runResult.exitCode === expectedCliExit,
    errors, warnings,
    targetedTests: { status: outcome?.checks?.targetedTests?.status ?? null, exitCode: outcome?.checks?.targetedTests?.exitCode ?? null, expectedTests, expectedCountPassed: testsPass },
    typecheck: { status: outcome?.checks?.typecheck?.status ?? null, exitCode: outcome?.checks?.typecheck?.exitCode ?? null },
    reportPublisher: { status: publisher?.status ?? null, exitCode: publisher?.exitCode ?? null },
    reportContentStatusMatchesOutcome: report.includes(`- Content validation status: ${outcome?.contentValidationStatus}`),
    reportOverallStatusMatchesOutcome: report.includes(`- Overall validator + child-check outcome: ${outcome?.overallStatus}`),
    rawCommandStreamsPresent: typeof stdout === 'string' && typeof stderr === 'string',
    archivedSummary,
  })
}
const playlog = await parsePlaylog(join(runDirectory, 'playlog.jsonl'))
const summary = await readFile(join(runDirectory, 'f-content-validation-summary.md'))
const summaryRecord = playlog.find(entry => entry.file === 'f-content-validation-summary.md' && entry.kind === 'initial-capture')
let archivedSummaryMatches = false
if (summaryRecord) {
  const archived = inflateSync(Buffer.from(summaryRecord.content, 'base64'))
  archivedSummaryMatches = archived.length === summaryRecord.bytes && sha(archived) === summaryRecord.sha256 && sha(archived) === sha(summary)
}
const result = {
  actualHead: before.head, afterHead: after.head,
  baselineInput: { path: baselinePath, currentSha256: baselineCurrentSha, capturedSha256s: [...new Set(cases.map(entry => entry.baselineInputShaAtRun))] },
  headUnchanged: before.head === after.head,
  branchUnchanged: before.branch === after.branch,
  sourceConfigPackageMapsEqual: JSON.stringify(before.sha256) === JSON.stringify(after.sha256),
  mapFileCount: Object.keys(before.sha256).length,
  cases,
  summaryArchive: { recordPresent: Boolean(summaryRecord), integrityAndCurrentBytesMatch: archivedSummaryMatches },
  allSevenCaseEvidenceVerified: cases.length === 7 && cases.every(entry => (entry.cliExit === 0 || entry.cliExit === 1) && !entry.cliSignal && !entry.cliSpawnError && entry.qaRunCount === 1 && entry.generatedMatchesExtractionManifest && entry.capturedInputMatchesGenerated && entry.recomputedSourceFingerprintMatches && entry.capturedSourceMismatches.length === 0 && entry.baselineInputSnapshotMatches && entry.baselineInputStillSame && entry.cliExitMatchesOutcome && entry.targetedTests.status === 'PASS' && entry.targetedTests.exitCode === 0 && entry.targetedTests.expectedCountPassed && entry.typecheck.status === 'PASS' && entry.typecheck.exitCode === 0 && entry.reportPublisher.status === 'PASS' && entry.reportPublisher.exitCode === 0 && entry.reportContentStatusMatchesOutcome && entry.reportOverallStatusMatchesOutcome),
  allSevenContentValidationPass: cases.length === 7 && cases.every(entry => entry.contentStatus === 'PASS' && entry.overallStatus === 'PASS'),
}
result.verificationPass = result.headUnchanged && result.branchUnchanged && result.sourceConfigPackageMapsEqual && result.allSevenCaseEvidenceVerified && archivedSummaryMatches
await writeFile(join(runDirectory, 'artifacts/independent-verification.json'), `${JSON.stringify(result, null, 2)}\n`)
process.stdout.write(`${JSON.stringify({ verificationPass: result.verificationPass, headUnchanged: result.headUnchanged, sourceConfigPackageMapsEqual: result.sourceConfigPackageMapsEqual, allSevenCaseEvidenceVerified: result.allSevenCaseEvidenceVerified, allSevenContentValidationPass: result.allSevenContentValidationPass, summaryArchive: result.summaryArchive, cases: cases.map(({ name, cliExit, contentStatus, overallStatus, errors, warnings, targetedTests, typecheck }) => ({ name, cliExit, contentStatus, overallStatus, errors, warnings, targetedTests, typecheck })) }, null, 2)}\n`)

async function parsePlaylog(path) {
  return (await readFile(path, 'utf8')).split('\n').filter(Boolean).map(line => JSON.parse(line))
}
