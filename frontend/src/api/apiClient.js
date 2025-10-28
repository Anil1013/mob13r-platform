import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://backend.mob13r.com/api',
  timeout: 15000
});

export default apiClient;
