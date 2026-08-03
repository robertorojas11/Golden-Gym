import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface UserPayload {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleName: string;
  permissions: string[];
  mustChangePassword?: boolean;
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('access_token'));
  const user = ref<UserPayload | null>(
    localStorage.getItem('user_payload')
      ? JSON.parse(localStorage.getItem('user_payload')!)
      : null
  );
  
  const isAuthenticated = computed(() => !!token.value);
  const userRole = computed(() => user.value?.roleName || 'viewer');
  const userPermissions = computed(() => user.value?.permissions || []);

  function hasPermission(permission: string): boolean {
    if (userRole.value === 'owner') return true;
    if (userRole.value === 'receptionist' && [
      'manage:memberships',
      'manage:payments',
      'manage:access',
    ].includes(permission)) return true;
    return userPermissions.value.includes(permission);
  }

  function setAuth(accessToken: string, payload: UserPayload) {
    token.value = accessToken;
    user.value = payload;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('user_payload', JSON.stringify(payload));
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_payload');
  }

  return {
    token,
    user,
    isAuthenticated,
    userRole,
    userPermissions,
    hasPermission,
    setAuth,
    logout,
  };
});
