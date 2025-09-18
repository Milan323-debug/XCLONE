import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export const useUserSync = () => {
  // On app start, hydrate auth store from AsyncStorage
  useEffect(() => {
    const check = async () => {
      try {
        const checkFn = useAuthStore.getState().checkAuth;
        if (checkFn) await checkFn();
        // after local check, try fetch latest user from backend
        const fetchMe = useAuthStore.getState().fetchMe;
        if (fetchMe) await fetchMe();
      } catch (err) {
        console.error('useUserSync checkAuth error', err);
      }
    };

    void check();
  }, []);
};

export default useUserSync;
