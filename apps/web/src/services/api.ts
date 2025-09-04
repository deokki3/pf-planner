import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL;
const tokenKey = 'pf_token';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,   // <-- send sid cookie
});

export const setAuthToken = (t: string | null) => {
  if (t) {
    localStorage.setItem(tokenKey, t);
    api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
  } else {
    localStorage.removeItem(tokenKey);
    delete api.defaults.headers.common['Authorization'];
  }
};

export const loadAuthToken = () => {
  const t = localStorage.getItem(tokenKey);
  if (t) api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
  return t;
};


