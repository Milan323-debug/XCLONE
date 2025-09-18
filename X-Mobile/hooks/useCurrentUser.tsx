import { useAuthStore } from '../store/authStore';

export const useCurrentUser = () => {
  const currentUser = useAuthStore((s) => s.user);
  return { currentUser };
};

export default useCurrentUser;
