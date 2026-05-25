import axios from "axios";

const apiClient = axios.create({
  baseURL: "https://joymap-api.onrender.com/api",
});

export default apiClient;
