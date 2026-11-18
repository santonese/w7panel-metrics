import assert from 'node:assert/strict'
import test from 'node:test'
import { loadMarketPlugins, pluginRows } from './api.js'

test('market list keeps only monitoring plugin applications', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async (_, options) => {
    assert.equal(JSON.parse(options.body).tag, '监控插件')
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
  const groups = [{ metadata: { name: 'metrics-traffic', labels: { 'w7.cc/manifest-type': 'metrics-plugin' } }, spec: { identifie: 'metrics_traffic' } }]
  assert.equal(pluginRows(market, groups)[0].appGroup, groups[0])
  assert.equal(pluginRows([], groups)[0].appGroup, groups[0])
})
