
import axios from 'axios';

const API_BASE_URL = 'http://localhost:4000/api/v1'; // Update to your backend URL as needed

const api = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		'Content-Type': 'application/json',
	},
});

// Optionally, add interceptors for auth token
api.interceptors.request.use((config) => {
	const token = localStorage.getItem('auth_token');
	if (token) {
		config.headers['Authorization'] = `Bearer ${token}`;
	}
	return config;
});

export default api;
