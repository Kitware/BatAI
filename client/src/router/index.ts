import { createRouter, createWebHistory, RouteLocationNormalized } from 'vue-router';
import HomePage from '../views/HomePage.vue';
import Recordings from '../views/Recordings.vue';
import Spectrogram from '../views/Spectrogram.vue';
import Login from '../views/Login.vue';

import oauthClient from '../plugins/Oauth';

function beforeEach(
  to: RouteLocationNormalized,
  _: RouteLocationNormalized,
  next: (route?: string) => void,
) {
  if (!oauthClient.isLoggedIn && to.name !== 'Login') {
    next('/login');
    return;
  }  if (oauthClient.isLoggedIn && to.name === 'Login') {
    next('/');
  }
  next();
}


function routerInit(){
  const router  = createRouter({
    history: createWebHistory(),
    routes: [
      {
        path: '/',
        component: HomePage,
      },
      {
        path: '/login',
        name: 'Login',
        component: Login,
      },
      {
        path: '/recordings',
        component: Recordings,
      },
      {
        path: '/recording/:id/spectrogram',
        component: Spectrogram,
        props: true,
      },

    ],
  });
  router.beforeEach(beforeEach);
  return router;
}

export default routerInit;
