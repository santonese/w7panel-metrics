<template>
  <section class="page">
    <div class="page-heading"><div><h1>监控插件</h1><p>从制品库安装和管理独立监控应用</p></div><a-button :loading="loading" @click="refresh">刷新</a-button></div>
    <a-alert v-if="error" type="error" show-icon>{{ error }}</a-alert>
    <section class="card"><a-table :data="rows" :loading="loading" :pagination="false" row-key="identify">
      <template #columns>
        <a-table-column title="插件"><template #cell="{ record }"><b>{{ record.name }}</b><div class="muted">{{ record.description || record.identify }}</div></template></a-table-column>
        <a-table-column title="版本" data-index="latest_version" :width="120" />
        <a-table-column title="状态" :width="110"><template #cell="{ record }"><a-tag :color="record.appGroup ? 'green' : 'orangered'">{{ record.appGroup ? '已安装' : '待安装' }}</a-tag></template></a-table-column>
        <a-table-column title="操作" :width="250"><template #cell="{ record }"><a-space>
          <a-link v-if="!record.appGroup" @click="install(record)">安装</a-link>
          <template v-else><a-link @click="openMenu(record)">应用菜单</a-link><a-popconfirm :content="`确认卸载 ${record.name} 及其关联资源吗？`" type="warning" @ok="uninstall(record)"><a-link v-if="record.appGroup.metadata?.annotations?.['w7.cc/deny-delete'] !== 'true'" status="danger">卸载</a-link></a-popconfirm></template>
        </a-space></template></a-table-column>
      </template>
    </a-table><a-empty v-if="!loading && !rows.length" description="暂无监控插件" /></section>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import { appHandles, k8sGet, loadMarketPlugins, openPluginMenu, pluginRows } from './api'

const rows = ref([]), loading = ref(false), error = ref('')
async function refresh() {
  loading.value = true
  error.value = ''
  try {
    const [market, groups] = await Promise.all([
      loadMarketPlugins(),
      k8sGet('/apis/w7panel.w7.com/v1alpha1/namespaces/default/appgroups'),
    ])
    rows.value = pluginRows(market, groups?.items || [])
  } catch (cause) {
    error.value = cause.message || '读取监控插件失败'
  } finally { loading.value = false }
}
function install(row) {
  const action = appHandles().toStoreInstall
  if (!row.formula_url || typeof action !== 'function') return Message.error('缺少制品安装入口，请升级面板后重试')
  action(row.formula_url)
}
function openMenu(row) {
  try { openPluginMenu(row.appGroup.metadata.name) } catch (cause) { Message.error(cause.message) }
}
async function uninstall(row) {
  const action = appHandles().uninstallInstalledApp
  if (typeof action !== 'function') return Message.error('面板未提供卸载入口，请升级面板后重试')
  try {
    const removed = await action({ appIdentify: row.appGroup.metadata.name, namespace: row.appGroup.metadata.namespace || 'default', alreadyConfirmed: true })
    if (removed) await refresh()
  } catch (cause) { Message.error(cause.message || '卸载失败') }
}
onMounted(refresh)
</script>
