import axiosClient from "axios";
import { getToken } from "/services/auth-storage";

const axios = axiosClient.create({
  baseURL: "http://10.67.144.170:8000/api",
  headers: {
    Accept: "Content-Type: application/json",
  },
});

axios.interceptors.request.use(async (req) => {
  const token = await getToken();
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default axios;