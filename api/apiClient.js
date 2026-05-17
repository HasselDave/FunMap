import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://192.168.100.22:3000/api",
});

export default apiClient;
