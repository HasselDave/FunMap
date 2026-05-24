import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://192.168.1.3:3000/api",
});

export default apiClient;
