import assert from 'node:assert/strict'
import test from 'node:test'
import { loadMarketPlugins, pluginRows } from './api.js'

test('market list keeps only monitoring plugin applications', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://zm.w7.com/zpk-market/formula/list')
    assert.equal(options.method, 'POST')
    assert.deepEqual(JSON.parse(options.body), { page: 1, limit: 500, tag: '监控插件' })
    return { ok: true, json: async () => ({ code: 200, data: { list: [
      { identify: 'metrics-traffic', application_type: 'metrics-plugin' },
      { identify: 'w7panel-metrics', application_type: 'helm' },
    ] } }) }
  }
  try { assert.deepEqual((await loadMarketPlugins()).map(item => item.identify), ['metrics-traffic']) }
  finally { globalThis.fetch = original }
})

test('installed AppGroup matches market identify with underscore normalization', () => {
  const market = [{ identify: 'metrics-traffic' }]
  const groups = [{ metadata: { name: 'metrics-traffic-wijvhtpk', labels: { 'w7.cc/manifest-type': 'helm' } }, spec: { identifie: 'metrics_traffic' } }]
  assert.equal(pluginRows(market, groups)[0].appGroup, groups[0])
  assert.equal(pluginRows(market, [])[0].appGroup, null)
  assert.equal(pluginRows([], groups).length, 0)
})
