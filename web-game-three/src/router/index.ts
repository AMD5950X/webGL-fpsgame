import { createRouter, createWebHistory } from 'vue-router'
import Home from '../components/Home.vue'
import FPSGameComponent from '../components/FPSGameComponent.vue'
import ChatRoom from '../components/ChatRoom.vue'
import TestGame from '../components/TestGame.vue'
import SimpleTest from '../components/SimpleTest.vue'
import SimpleFPSGame from '../components/SimpleFPSGame.vue'
import BabylonPhysicsFPS from '../components/BabylonPhysicsFPS.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/game',
    name: 'Game',
    component: FPSGameComponent
  },
  {
    path: '/chat',
    name: 'Chat',
    component: ChatRoom
  },
  {
    path: '/test',
    name: 'TestGame',
    component: TestGame
  },
  {
    path: '/simple',
    name: 'SimpleTest',
    component: SimpleTest
  },
  {
    path: '/simplefps',
    name: 'SimpleFPSGame',
    component: SimpleFPSGame
  },
  {
    path: '/babylonphysics',
    name: 'BabylonPhysicsFPS',
    component: BabylonPhysicsFPS
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router