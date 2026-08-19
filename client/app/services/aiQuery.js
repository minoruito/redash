import { axios } from "@/services/axios";

export default {
  generateQuery: data => axios.post("api/ai/generate_query", data),
};
