import axios from "axios";

export const appApi = axios.create({
  baseURL: import.meta.env.VITE_APP_API_URL, // fixed backend
  headers: {
    "Content-Type": "application/json",
  },
});
