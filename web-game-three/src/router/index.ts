import { createRouter, createWebHistory } from 'vue-router'
import Home from '../components/Home.vue'
import BabylonCannonDemo from '../components/BabylonCannonDemo.vue'
import FPSGameDemo from '../components/FPSGameDemo.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/physics',
    name: 'BabylonCannonDemo',
    component: BabylonCannonDemo
  },
  {
    path: '/fps',
    name: 'FPSGameDemo',
    component: FPSGameDemo
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router