import assert from 'node:assert/strict'
import test from 'node:test'
import { loadMarketPlugins, pluginRows, pluginUpgrades } from './api.js'

test('market list includes every application with the monitoring plugin tag', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://zm.w7.com/zpk-market/formula/list')
    assert.equal(options.method, 'POST')
    assert.deepEqual(JSON.parse(options.body), { page: 1, limit: 500, tag: '监控插件' })
    return { ok: true, json: async () => ({ code: 200, data: { list: [
      { identify: 'metrics-traffic', application_type: 'metrics-plugin' },
      { identify: 'metrics-audit', application_type: 'helm' },
    ] } }) }
  }
  try { assert.deepEqual((await loadMarketPlugins()).map(item => item.identify), ['metrics-traffic', 'metrics-audit']) }
  finally { globalThis.fetch = original }
})

test('installed AppGroup matches market identify with underscore normalization', () => {
  const market = [{ identify: 'metrics-traffic' }]
  const groups = [{ metadata: { name: 'metrics-traffic-wijvhtpk', labels: { 'w7.cc/manifest-type': 'helm' } }, spec: { identifie: 'metrics_traffic' } }]
  assert.equal(pluginRows(market, groups)[0].appGroup, groups[0])
  assert.equal(pluginRows(market, [])[0].appGroup, null)
  assert.equal(pluginRows([], groups).length, 0)
})

test('upgrade check covers installed plugins and ignores individual failures', async () => {
  const rows = [
    { identify: 'old', appGroup: { metadata: { name: 'old-release' } } },
    { identify: 'broken', appGroup: { metadata: { name: 'broken-release' } } },
    { identify: 'new', appGroup: null },
  ]
  const checked = []
  const upgrades = await pluginUpgrades(rows, async ({ appIdentify, silent }) => {
    assert.equal(silent, true)
    checked.push(appIdentify)
    if (appIdentify === 'broken-release') throw new Error('unavailable')
    return { canUpgrade: true, version: '1.0.2', zpkUrl: 'https://example.test/plugin' }
  })
  assert.deepEqual(checked.sort(), ['broken-release', 'old-release'])
  assert.deepEqual(Object.keys(upgrades), ['old-release'])
  assert.equal(upgrades['old-release'].version, '1.0.2')
})
