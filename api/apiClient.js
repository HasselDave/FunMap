import axios from "axios";

const apiClient = axios.create({
  // IMPORTANT: Use your actual IP address (e.g. 192.168.1.5), not 'localhost'
  // because your phone/emulator won't understand 'localhost'
  baseURL: "http://192.168.X.X:3000/api",
});

export default apiClient;
