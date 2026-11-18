<template>
  <main class="metrics-app">
    <header v-if="!embedded" class="local-nav"><router-link to="/dashboard">监控大屏</router-link><router-link to="/plugins">监控插件</router-link></header>
    <router-view />
  </main>
</template>

<script setup>
const embedded = Boolean(window.__POWERED_BY_WUJIE__ || window.microData?.cd)
</script>
