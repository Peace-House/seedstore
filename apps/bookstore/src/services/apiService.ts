import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL; // Update to your backend URL as needed

const api = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		'Content-Type': 'application/json',
	},
});

// Attach auth token to requests
api.interceptors.request.use((config) => {
	const token = localStorage.getItem('auth_token');
	if (token) {
		config.headers['Authorization'] = `Bearer ${token}`;
	}
	return config;
});

// On 401 for authenticated requests, session was terminated (e.g. removed on another device or expired)
api.interceptors.response.use(
	(response) => response,
	(error) => {
		const status = error.response?.status;
		const hadAuth = error.config?.headers?.Authorization != null;
		if (status === 401 && hadAuth) {
			localStorage.removeItem('auth_token');
			window.location.href = '/auth';
		}
		return Promise.reject(error);
	}
);

export default api;
