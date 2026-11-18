<template>
  <main class="metrics-app">
    <header v-if="!embedded" class="local-nav"><router-link to="/dashboard">监控大屏</router-link><router-link to="/plugins">监控插件</router-link></header>
    <router-view />
  </main>
</template>

<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const embedded = Boolean(window.__POWERED_BY_WUJIE__ || window.microData?.cd)
const router = useRouter()
const wujieBus = window.$wujie?.bus

function onRouteChange(target, data) {
  if (data?.fromSubPanel || typeof target !== 'string') return
  router.push(target.startsWith('#') ? target.slice(1) || '/dashboard' : target).catch(() => {})
}

onMounted(() => wujieBus?.$on?.('routeChange', onRouteChange))
onBeforeUnmount(() => wujieBus?.$off?.('routeChange', onRouteChange))
</script>
