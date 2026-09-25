// import axiosClient from "axios";
// import { getToken } from "/services/auth-storage";

// const axios = axiosClient.create({
//   baseURL: "http://10.90.129.170:8000/api",
//   headers: {
//     Accept: "Content-Type: application/json",
//   },
// });

// axios.interceptors.request.use(async (req) => {
//   const token = await getToken();
//   if (token) {
//     req.headers.Authorization = `Bearer ${token}`;
//   }
//   return req;
// });

// export default axios;



// import axiosClient from "axios";
// import { getToken } from "/services/auth-storage";
// const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
// const axios = axiosClient.create({
//   baseURL: import.meta.env.VITE_API_URL,
//   headers: {
//     Accept: "Content-Type: application/json",
//   },
// });

// axios.interceptors.request.use(async (req) => {
//   const token = await getToken();
//   if (token) {
//     req.headers.Authorization = `Bearer ${token}`;
//   }
//   return req;
// });

// export default axios;




import axiosClient from "axios";
import { getToken } from "../services/auth-storage"; // ✅ Fixed path: step up from /api to /web, then into /services



// const baseURL =
//   import.meta.env.VITE_API_URL ||
//   "http://localhost:8000/api";   // ← change fallback


const baseURL =
  import.meta.env.VITE_API_URL ||
  "https://thisnorth-production-backend.up.railway.app/api";

const axios = axiosClient.create({
  baseURL,
  headers: { Accept: "application/json" },
});


// Vite requires variables to start with VITE_. 
// We provide a fallback to your production Railway URL just in case.
// const baseURL = import.meta.env.VITE_API_URL || 'https://thisnorth-production-backend.up.railway.app/api';

// const axios = axiosClient.create({
//   baseURL: baseURL, // Using the variable we just defined
//   headers: {

//     "Accept": "application/json",
//   },
// });

axios.interceptors.request.use(async (req) => {
  const token = await getToken();
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default axios;