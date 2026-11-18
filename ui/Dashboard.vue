<template>
  <section class="page">
    <div class="page-heading"><div><h1>监控大屏</h1><p>当前集群资源概况</p></div><a-button :loading="loading" @click="refresh">刷新</a-button></div>
    <a-alert v-if="error" type="error" show-icon>{{ error }}</a-alert>
    <a-spin :loading="loading" style="display:block">
      <div class="stats">
        <article><span>节点</span><strong>{{ nodes.length }}</strong><small>就绪 {{ readyNodes }} / {{ nodes.length }}</small></article>
        <article><span>Pod</span><strong>{{ pods.length }}</strong><small>运行中 {{ runningPods }} / {{ pods.length }}</small></article>
        <article><span>CPU 使用</span><strong>{{ percent(cpu) }}</strong><small>{{ cores(usage?.cpu?.usage) }} / {{ cores(usage?.cpu?.total) }} 核</small></article>
        <article><span>内存使用</span><strong>{{ percent(memory) }}</strong><small>{{ bytes(usage?.memory?.usage) }} / {{ bytes(usage?.memory?.total) }}</small></article>
      </div>
      <section class="card"><h2>节点状态</h2><a-empty v-if="!nodes.length" description="暂无节点数据" /><a-table v-else :data="nodes" :pagination="false" row-key="metadata.name"><template #columns><a-table-column title="节点" :render="({ record }) => record.metadata.name" /><a-table-column title="状态"><template #cell="{ record }"><a-tag :color="isReady(record) ? 'green' : 'red'">{{ isReady(record) ? '就绪' : '未就绪' }}</a-tag></template></a-table-column><a-table-column title="角色"><template #cell="{ record }">{{ nodeRole(record) }}</template></a-table-column></template></a-table></section>
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
const cpu = computed(() => Number(usage.value?.cpu?.usage || 0) / Number(usage.value?.cpu?.total || 0))
const memory = computed(() => Number(usage.value?.memory?.usage || 0) / Number(usage.value?.memory?.total || 0))
const percent = value => Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '—'
const cores = milli => milli == null ? '—' : (Number(milli) / 1000).toFixed(1)
const bytes = value => value == null ? '—' : `${(Number(value) / 1073741824).toFixed(1)} GiB`
const nodeRole = node => Object.keys(node.metadata?.labels || {}).some(key => key.includes('control-plane')) ? '控制节点' : '工作节点'

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
