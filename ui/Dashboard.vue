<template>
  <section class="page">
    <div class="page-heading"><div><h1>监控大屏</h1><p>集群资源与工作负载概况</p></div><a-button :loading="loading" @click="refresh">刷新</a-button></div>
    <a-alert v-if="error" type="error" show-icon>{{ error }}</a-alert>
    <a-spin :loading="loading" style="display:block">
      <div class="stats">
        <article><span>集群节点</span><strong>{{ nodes.length }}</strong><small>就绪 {{ readyNodes }} · 未就绪 {{ nodes.length - readyNodes }}</small></article>
        <article><span>Pod 总数</span><strong>{{ pods.length }}</strong><small>运行中 {{ runningPods }} · 重启 {{ restartCount }} 次</small></article>
        <article><span>CPU 使用率</span><strong>{{ percent(cpu) }}</strong><div class="usage-track"><span :style="{ width: barWidth(cpu) }" /></div><small>{{ cores(usage?.cpu?.usage) }} / {{ cores(usage?.cpu?.total) }} 核</small></article>
        <article><span>内存使用率</span><strong>{{ percent(memory) }}</strong><div class="usage-track"><span :style="{ width: barWidth(memory) }" /></div><small>{{ bytes(usage?.memory?.usage) }} / {{ bytes(usage?.memory?.total) }}</small></article>
      </div>
      <div class="dashboard-grid">
        <section class="card"><h2>Pod 状态</h2><template v-if="pods.length"><div v-for="phase in podPhases" :key="phase.name" class="phase-row"><span>{{ phase.name }}</span><div class="phase-track"><span :style="{ width: barWidth(phase.count / pods.length), background: phase.color }" /></div><b>{{ phase.count }}</b></div></template><a-empty v-else description="暂无 Pod 数据" /></section>
        <section class="card"><h2>Pod 数最多的命名空间</h2><a-empty v-if="!namespaceRows.length" description="暂无 Pod 数据" /><div v-for="item in namespaceRows" :key="item.name" class="namespace-row"><span>{{ item.name }}</span><span>{{ item.count }} 个 Pod</span></div></section>
      </div>
      <section class="card node-card"><h2>节点状态</h2><a-empty v-if="!nodes.length" description="暂无节点数据" /><a-table v-else :data="nodes" :pagination="false" row-key="metadata.name"><template #columns>
        <a-table-column title="节点"><template #cell="{ record }"><b>{{ record.metadata.name }}</b><div class="muted node-detail">{{ nodeAddress(record) }}</div></template></a-table-column>
        <a-table-column title="状态" :width="110"><template #cell="{ record }"><a-tag :color="isReady(record) ? 'green' : 'red'">{{ isReady(record) ? '就绪' : '未就绪' }}</a-tag></template></a-table-column>
        <a-table-column title="角色" :width="120"><template #cell="{ record }">{{ nodeRole(record) }}</template></a-table-column>
        <a-table-column title="Kubelet 版本" :width="150"><template #cell="{ record }">{{ record.status?.nodeInfo?.kubeletVersion || '—' }}</template></a-table-column>
      </template></a-table></section>
    </a-spin>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { k8sGet, panelGet } from './api'

const nodes = ref([]), pods = ref([]), usage = ref(null), loading = ref(false), error = ref('')
const isReady = node => node.status?.conditions?.some(item => item.type === 'Ready' && item.status === 'True')
const readyNodes = computed(() => nodes.value.filter(isReady).length)
const runningPods = computed(() => pods.value.filter(item => item.status?.phase === 'Running').length)
const restartCount = computed(() => pods.value.reduce((total, pod) => total + (pod.status?.containerStatuses || []).reduce((count, container) => count + (container.restartCount || 0), 0), 0))
const podPhases = computed(() => [
  { name: '运行中', phase: 'Running', color: '#00b42a' },
  { name: '等待中', phase: 'Pending', color: '#ff7d00' },
  { name: '已完成', phase: 'Succeeded', color: '#165dff' },
  { name: '失败', phase: 'Failed', color: '#f53f3f' },
  { name: '未知', phase: 'Unknown', color: '#86909c' },
].map(item => ({ ...item, count: pods.value.filter(pod => (pod.status?.phase || 'Unknown') === item.phase).length })))
const namespaceRows = computed(() => {
  const counts = new Map()
  pods.value.forEach(pod => {
    const namespace = pod.metadata?.namespace || 'default'
    counts.set(namespace, (counts.get(namespace) || 0) + 1)
  })
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5)
})
const cpu = computed(() => Number(usage.value?.cpu?.usage || 0) / Number(usage.value?.cpu?.total || 0))
const memory = computed(() => Number(usage.value?.memory?.usage || 0) / Number(usage.value?.memory?.total || 0))
const percent = value => Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '—'
const barWidth = value => `${Number.isFinite(value) ? Math.max(0, Math.min(100, value * 100)) : 0}%`
const cores = milli => milli == null ? '—' : (Number(milli) / 1000).toFixed(1)
const bytes = value => value == null ? '—' : `${(Number(value) / 1073741824).toFixed(1)} GiB`
const nodeRole = node => Object.keys(node.metadata?.labels || {}).some(key => key.includes('control-plane')) ? '控制节点' : '工作节点'
const nodeAddress = node => node.status?.addresses?.find(item => item.type === 'InternalIP')?.address || '—'

async function refresh() {
  loading.value = true
  error.value = ''
  const results = await Promise.allSettled([
    k8sGet('/api/v1/nodes'),
    k8sGet('/api/v1/pods'),
    panelGet('metrics/usage/normal'),
  ])
  nodes.value = results[0].status === 'fulfilled' ? results[0].value?.items || [] : []
  pods.value = results[1].status === 'fulfilled' ? results[1].value?.items || [] : []
  usage.value = results[2].status === 'fulfilled' ? results[2].value : null
  const failures = results.filter(item => item.status === 'rejected')
  if (failures.length) error.value = failures.map(item => item.reason?.message || '数据读取失败').join('；')
  loading.value = false
}
onMounted(refresh)
</script>

<style scoped>
.usage-track,.phase-track{height:7px;border-radius:4px;background:var(--color-fill-2);overflow:hidden}
.usage-track span,.phase-track span{display:block;height:100%;border-radius:4px;background:rgb(var(--primary-6))}
.dashboard-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-bottom:16px}
.phase-row{display:grid;grid-template-columns:64px 1fr 36px;align-items:center;gap:12px;margin-top:13px;font-size:13px}
.phase-row b{text-align:right;font-weight:500}
.namespace-row{display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid var(--color-border-1);font-size:13px}
.namespace-row:last-child{border-bottom:0}
.namespace-row span:last-child{color:var(--color-text-3)}
.node-detail{font-size:12px;margin-top:4px}
@media(max-width:700px){.dashboard-grid{grid-template-columns:1fr}}
</style>
