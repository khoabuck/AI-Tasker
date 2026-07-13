import axiosInstance from "./axiosInstance";

const adminWorkflowPolicyApi = {
  getPolicy() {
    return axiosInstance.get("/admin/workflow-policy");
  },

  updatePolicy(data) {
    return axiosInstance.put("/admin/workflow-policy", data);
  },
};

export default adminWorkflowPolicyApi;