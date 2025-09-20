import { API_URL } from '../constants/api';

export async function testApiConnection() {
    try {
        const response = await fetch(`${API_URL.replace(/\/$/, '')}/api/posts`);
        console.log('API test response status:', response.status);
        const data = await response.json();
        console.log('API test successful:', data);
        return true;
    } catch (error) {
        console.error('API test failed:', error);
        return false;
    }
}