import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'

const require = createRequire(import.meta.url)
const { chromium } = require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const outputDir = new URL('./', import.meta.url)
await mkdir(outputDir, { recursive: true })
const events = { startedAt: new Date().toISOString(), consoleErrors: [], pageErrors: [], requestFailures: [], steps: [] }
const mark = (name, extra = {}) => events.steps.push({ name, at: new Date().toISOString(), ...extra })
const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await context.newPage()
page.on('console', message => { if (message.type() === 'error') events.consoleErrors.push({ text: message.text(), location: message.location() }) })
page.on('pageerror', error => events.pageErrors.push(String(error.stack || error)))
page.on('requestfailed', request => events.requestFailures.push({ url: request.url(), failure: request.failure()?.errorText }))
const started = performance.now()

try {
  await page.goto('http://127.0.0.1:4180/', { waitUntil: 'networkidle', timeout: 30000 })
  await page.screenshot({ path: new URL('initial.png', outputDir).pathname, fullPage: true })
  await page.getByRole('button', { name: '起身' }).click()
  await page.getByRole('group', { name: '世界時間速度' }).getByRole('button', { name: '暫停' }).click()
  await page.locator('.tile[data-position="16,10"]').click()
  await page.locator('.context-action').click()
  const cropGroup = page.getByRole('group', { name: '選擇播種作物' })
  await cropGroup.waitFor({ timeout: 5000 })
  const seasonLine = await page.locator('.scene-description').innerText()
  const availableCrops = await cropGroup.getByRole('button').allTextContents()
  await cropGroup.getByRole('button', { name: '豌豆 · 1 日' }).click()
  await page.getByRole('button', { name: '整地 · 體力 6／20 分' }).click()
  await page.getByRole('button', { name: /^播種豌豆/ }).click()
  const plantedText = await page.locator('.plot-row').innerText()
  mark('spring-crop-planted', { seasonLine, availableCrops, plantedText })
  await page.screenshot({ path: new URL('planted.png', outputDir).pathname, fullPage: true })

  await page.keyboard.press('Escape')
  await page.getByRole('group', { name: '世界時間速度' }).getByRole('button', { name: '×20' }).click()
  await page.locator('.context-action').click()
  await page.getByRole('group', { name: '選擇播種作物' }).waitFor({ timeout: 5000 })
  let plotText = ''
  let mature = false
  const growthStarted = performance.now()
  for (let i = 0; i < 140; i++) {
    await page.waitForTimeout(250)
    plotText = await page.locator('.plot-row').innerText()
    if (plotText.includes('可收割')) { mature = true; break }
  }
  mark('growth-completed', { mature, elapsedMs: Math.round(performance.now() - growthStarted), plotText, hud: await page.locator('.world-clock').innerText() })
  if (!mature) throw new Error('Spring pea did not mature in Chromium at ×20 within 35 seconds')

  await page.getByRole('button', { name: /^收割/ }).click()
  const harvestedPlot = await page.locator('.plot-row').innerText()
  await page.getByRole('button', { name: '暫停時間' }).click()
  mark('harvested-and-paused', { harvestedPlot, materialMessage: await page.locator('.recent-event').innerText() })
  await page.screenshot({ path: new URL('harvested.png', outputDir).pathname, fullPage: true })

  await page.keyboard.press('Escape')
  await page.locator('.desktop-shortcuts').getByRole('button', { name: '物品' }).click()
  const categories = page.getByRole('group', { name: '物品分類' })
  await categories.getByRole('button', { name: '日常物品' }).click()
  await page.locator('.item-list').getByRole('button', { name: /食物/ }).click()
  const foodBeforeConversion = await page.locator('.item-detail').innerText()
  const beforeCount = Number(foodBeforeConversion.match(/持有 (\d+)/)?.[1])
  if (!Number.isSafeInteger(beforeCount)) throw new Error(`Could not read pre-conversion food count: ${foodBeforeConversion}`)
  await categories.getByRole('button', { name: '狼族素材' }).click()
  const peaStack = page.locator('.reward-material').filter({ hasText: '豌豆莢' })
  const materialBefore = await peaStack.innerText()
  await peaStack.getByRole('button', { name: /轉換 1 份/ }).click()
  const materialAfter = await peaStack.innerText()
  const remainingPeas = Number(materialAfter.match(/持有 (\d+)/)?.[1])
  if (!Number.isSafeInteger(remainingPeas)) throw new Error(`Could not read remaining crop-good count: ${materialAfter}`)
  await categories.getByRole('button', { name: '日常物品' }).click()
  const foodItem = page.locator('.item-list').getByRole('button', { name: /食物/ })
  await foodItem.click()
  const foodAfterConversion = await page.locator('.item-detail').innerText()
  const convertedCount = Number(foodAfterConversion.match(/持有 (\d+)/)?.[1])
  if (convertedCount !== beforeCount + 1) throw new Error(`Crop conversion should add one food: ${beforeCount} -> ${foodAfterConversion}`)
  mark('converted-to-food', { materialBefore, materialAfter, foodBeforeConversion, foodAfterConversion })
  await page.screenshot({ path: new URL('converted.png', outputDir).pathname, fullPage: true })

  await page.keyboard.press('Escape')
  const worldClockBeforeReload = await page.locator('.world-clock').innerText()
  await page.getByRole('button', { name: '存檔' }).click()
  await page.waitForTimeout(500)
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 })
  await page.locator('.desktop-shortcuts').getByRole('button', { name: '物品' }).click()
  await page.getByRole('group', { name: '物品分類' }).getByRole('button', { name: '日常物品' }).click()
  await page.locator('.item-list').getByRole('button', { name: /食物/ }).click()
  const foodAfterReload = await page.locator('.item-detail').innerText()
  await page.getByRole('group', { name: '物品分類' }).getByRole('button', { name: '狼族素材' }).click()
  const materialAfterReload = await page.locator('.reward-material').filter({ hasText: '豌豆莢' }).innerText()
  const reloadedCount = Number(foodAfterReload.match(/持有 (\d+)/)?.[1])
  const reloadedPeas = Number(materialAfterReload.match(/持有 (\d+)/)?.[1])
  const worldClockAfterReload = await page.locator('.world-clock').innerText()
  if (reloadedCount !== convertedCount || reloadedPeas !== remainingPeas || worldClockAfterReload !== worldClockBeforeReload) {
    throw new Error(`Reload did not preserve crop conversion state: food=${foodAfterReload}; pea=${materialAfterReload}; clock=${worldClockBeforeReload} -> ${worldClockAfterReload}`)
  }
  mark('reload-persistence-verified', { foodAfterReload, materialAfterReload, worldClockBeforeReload, worldClockAfterReload })
  await page.screenshot({ path: new URL('reloaded.png', outputDir).pathname, fullPage: true })
  events.status = 'PASS'
} catch (error) {
  events.status = 'FAIL'
  events.failure = String(error.stack || error)
  await page.screenshot({ path: new URL('failure-state.png', outputDir).pathname, fullPage: true }).catch(() => {})
} finally {
  events.elapsedMs = Math.round(performance.now() - started)
  events.finishedAt = new Date().toISOString()
  events.finalUrl = page.url()
  await writeFile(new URL('browser-events.json', outputDir), JSON.stringify(events, null, 2) + '\n')
  await browser.close()
}

if (events.status !== 'PASS') process.exitCode = 1
