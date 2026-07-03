import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import LoginView from '../views/LoginView.vue';
import DashboardView from '../views/DashboardView.vue';
import AccessControlView from '../views/AccessControlView.vue';
import MembersView from '../views/MembersView.vue';
import MembershipsView from '../views/MembershipsView.vue';
import PaymentsView from '../views/PaymentsView.vue';
import UserAdminView from '../views/UserAdminView.vue';
import ChangePasswordView from '../views/ChangePasswordView.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { public: true },
  },
  {
    path: '/change-password',
    name: 'ChangePassword',
    component: ChangePasswordView,
  },
  {
    path: '/',
    name: 'Dashboard',
    component: DashboardView,
  },
  {
    path: '/access-control',
    name: 'AccessControl',
    component: AccessControlView,
  },
  {
    path: '/members',
    name: 'Members',
    component: MembersView,
  },
  {
    path: '/memberships',
    name: 'Memberships',
    component: MembershipsView,
  },
  {
    path: '/payments',
    name: 'Payments',
    component: PaymentsView,
  },
  {
    path: '/users',
    name: 'UserAdmin',
    component: UserAdminView,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  
  if (to.meta.public) {
    next();
  } else if (!authStore.isAuthenticated) {
    next('/login');
  } else if (authStore.user?.mustChangePassword && to.path !== '/change-password') {
    next('/change-password');
  } else {
    const role = authStore.user?.roleName;
    if (role === 'clock') {
      if (to.path !== '/access-control' && to.path !== '/change-password') {
        next('/access-control');
      } else {
        next();
      }
    } else if (role === 'receptionist') {
      if (to.path === '/' || to.path === '/users') {
        next('/members');
      } else {
        next();
      }
    } else {
      next();
    }
  }
});

export default router;
export { routes };

