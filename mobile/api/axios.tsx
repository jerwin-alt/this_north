import axiosClient from "axios";
import { getToken } from "@/services/auth-storage";

const axios = axiosClient.create({
  baseURL: "http://10.95.250.170:8000/api",
  headers: {
    Accept: "application/json",
  },
});

// axios.interceptors.request.use(async (req) => {
//   const token = await getToken();
//   if (token) {
//     req.headers.Authorization = `Bearer ${token}`;
//   }
//   return req;
// });
axios.interceptors.request.use(async (req) => {
  const token = await getToken();
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
    console.log("✅ Token attached to request:", req.url);
  } else {
    console.warn("⚠️ No token found for request:", req.url);
  }
  return req;
});

export default axios;


