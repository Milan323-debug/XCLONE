import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_URL} from '../constants/api';

export const useAuthStore = create((set) => ({
    user: null, 
    token: null,
    isLoading: false,
    isCheckingAuth: true,
    
    // Fetch latest user profile from backend and update store
    fetchMe: async () => {
        try {
            const token = useAuthStore.getState().token;
            if (!token) return null;
            const res = await fetch(`${API_URL}/api/user/me`, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) return null;
            const json = await res.json();
            if (json.user) {
                await AsyncStorage.setItem('user', JSON.stringify(json.user));
                set({ user: json.user });
            }
            return json.user || null;
        } catch (e) {
            console.warn('fetchMe error', e.message);
            return null;
        }
    },
    
    register: async (username, email, password) => {
        // Early return for empty fields without setting loading state
        if (!username || !email || !password) {
            return { success: false, error: 'Please fill all fields' };
        }

        set({isLoading: true});
        try {
            const response = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({username, email, password}),
            });
            const data = await response.json();
            
            // Reset loading state and return error if response not ok
            if (!response.ok) {
                set({isLoading: false});
                return {success: false, error: data.message};
            }
            
            await AsyncStorage.setItem('user', JSON.stringify(data.user));
            await AsyncStorage.setItem('token', data.token);
            
            set({token: data.token, user: data.user, isLoading: false});
            return {success: true};
        } catch (error) {
            set({isLoading: false});
            return {success: false, error: error.message || 'Something went wrong'};
        }
    },

    login: async (email, password) => {

        set({isLoading: true});
        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({email, password}),
            });
            const data = await response.json();
            
            // Reset loading state and return error if response not ok
            if (!response.ok) throw new Error(data.message || 'Something went wrong');
            
            await AsyncStorage.setItem('user', JSON.stringify(data.user));
            await AsyncStorage.setItem('token', data.token);
            
            set({token: data.token, user: data.user, isLoading: false});
            return {success: true};
        } catch (error) {
            set({isLoading: false});
            return {success: false, error: error.message || 'Something went wrong'};
        }
    },
    checkAuth: async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const userJson = await AsyncStorage.getItem('user');
            const user = userJson ? JSON.parse(userJson) : null;

            set({token, user});
            // If we have a token, try to refresh user data from server
            if (token) {
                try {
                    const fn = useAuthStore.getState().fetchMe;
                    if (fn) await fn();
                } catch (err) {
                    console.warn('checkAuth fetchMe error', err?.message || err);
                }
            }
           
        } catch (error) {
            console.log('Error checking auth:', error);
        } finally {
            set({isCheckingAuth: false});
        }
    },

    logout: async () => {
        try {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            set({token: null, user: null});
        } catch (error) {
            console.log('Error logging out:', error);
        }
    },
}));