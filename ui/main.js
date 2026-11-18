import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import ArcoVue from '@arco-design/web-vue'
import ArcoVueIcon from '@arco-design/web-vue/es/icon'
import '@arco-design/web-vue/dist/arco.css'
import App from './App.vue'
import Dashboard from './Dashboard.vue'
import Plugins from './Plugins.vue'
import './style.css'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', component: Dashboard },
    { path: '/plugins', component: Plugins },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
})

createApp(App).use(ArcoVue).use(ArcoVueIcon).use(router).mount('#app')
