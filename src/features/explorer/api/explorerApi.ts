import axios from "axios";

export const explorerApi = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});
