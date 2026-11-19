<template>
  <section class="page">
    <div class="page-heading">
      <div><h1>监控插件</h1><p>从制品库安装和管理独立监控应用</p></div>
      <a-space>
        <a-input-search v-model="keyword" allow-clear placeholder="搜索插件名称" style="width:260px" />
        <a-button :loading="loading" @click="refresh">刷新</a-button>
      </a-space>
    </div>
    <a-alert v-if="error" type="error" show-icon>{{ error }}</a-alert>
    <section class="card plugin-list">
      <div v-if="filteredRows.length" class="plugin-category">
        <div class="plugin-category__title"><span>监控插件</span><span class="plugin-category__count">{{ filteredRows.length }} 个插件</span></div>
        <a-table :data="filteredRows" :loading="loading" :pagination="false" :show-header="false" :bordered="false" row-key="identify">
          <template #columns>
            <a-table-column title="插件" :width="360"><template #cell="{ record }">
              <div class="plugin-name">{{ record.name }}</div>
              <div class="muted plugin-detail">{{ record.identify }}<span v-if="record.latest_version" class="plugin-version">v{{ record.latest_version }}</span></div>
              <div v-if="record.description" class="muted plugin-detail">{{ record.description }}</div>
            </template></a-table-column>
            <a-table-column title="状态" :width="130"><template #cell="{ record }">
              <a-tag :color="record.appGroup ? 'green' : 'gray'">{{ record.appGroup ? '已安装' : '未安装' }}</a-tag>
            </template></a-table-column>
            <a-table-column title="操作" :width="220"><template #cell="{ record }"><a-space>
              <a-link v-if="!record.appGroup" @click="install(record)">安装</a-link>
              <template v-else>
                <a-link @click="openMenu(record)">应用菜单</a-link>
                <a-popconfirm v-if="record.appGroup.metadata?.annotations?.['w7.cc/deny-delete'] !== 'true'" :content="`确认卸载 ${record.name} 及其关联资源吗？`" type="warning" @ok="uninstall(record)"><a-link status="danger">卸载</a-link></a-popconfirm>
              </template>
            </a-space></template></a-table-column>
          </template>
        </a-table>
      </div>
      <a-empty v-else-if="!loading" description="暂无监控插件" />
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import { appHandles, k8sGet, loadMarketPlugins, openPluginMenu, pluginRows } from './api'

const rows = ref([]), loading = ref(false), error = ref(''), keyword = ref('')
const filteredRows = computed(() => {
  const search = keyword.value.trim().toLowerCase()
  return search ? rows.value.filter(row => `${row.name} ${row.identify} ${row.description || ''}`.toLowerCase().includes(search)) : rows.value
})
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

<style scoped>
.plugin-list{padding:0;overflow:hidden;border-radius:4px}
.plugin-category__title{display:flex;align-items:center;justify-content:space-between;height:44px;padding:0 16px;background:var(--color-primary-light-1);color:rgb(var(--primary-6));border-left:3px solid rgb(var(--primary-6));font-size:14px;font-weight:500}
.plugin-category__count{font-size:12px;font-weight:400;color:var(--color-text-3)}
.plugin-category :deep(.arco-table-container){border-top:1px solid var(--color-border-1)}
.plugin-name{font-weight:500}
.plugin-detail{font-size:12px;margin-top:4px}
.plugin-version{display:inline-block;margin-left:4px}
@media(max-width:650px){
  .page-heading{align-items:stretch;flex-direction:column}
  .page-heading :deep(.arco-input-wrapper){width:100%!important}
  .plugin-category :deep(.arco-table-element){width:100%!important;table-layout:fixed}
  .plugin-category :deep(col){min-width:0!important;max-width:none!important}
  .plugin-category :deep(col:nth-child(1)){width:42%!important}
  .plugin-category :deep(col:nth-child(2)){width:20%!important}
  .plugin-category :deep(col:nth-child(3)){width:38%!important}
  .plugin-category :deep(.arco-table-td){width:auto!important}
  .plugin-category :deep(.arco-table-cell){padding:12px 8px}
  .plugin-category :deep(.arco-space){flex-wrap:wrap}
  .plugin-detail{overflow-wrap:anywhere}
}
</style>
