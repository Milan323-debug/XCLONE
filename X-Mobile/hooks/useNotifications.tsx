import { useEffect, useState } from 'react';
import { API_URL } from '../constants/api';
import { useAuthStore } from '../store/authStore';
import { Notification } from '../types/notification';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);
  const token = useAuthStore((s) => s.token);

  const fetchNotifications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}api/notifications`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error('Failed to load notifications');
      const json = await res.json();
      setNotifications(json.notifications || []);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load notifications'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchNotifications();
  }, []);

  const refetch = async () => {
    setIsRefetching(true);
    try {
      await fetchNotifications();
    } finally {
      setIsRefetching(false);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const res = await fetch(`${API_URL}api/notifications/${notificationId}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error('Failed to delete notification');
      setNotifications((n) => n.filter((x) => x._id !== notificationId));
    } catch (e) {
      console.error('deleteNotification error', e);
    }
  };

  return { notifications, isLoading, error, refetch, isRefetching, deleteNotification };
};

export default useNotifications;
