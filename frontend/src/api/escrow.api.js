// src/api/escrow.api.js
import axiosInstance from "./axiosInstance";

const escrowApi = {
  /**
   * Get all escrow records belonging to a project.
   * GET /api/escrows/projects/{projectId}
   */
  getProjectEscrows(projectId) {
    return axiosInstance.get(`/escrows/projects/${projectId}`);
  },

  /**
   * CLIENT only:
   * Lock the required project escrow amount.
   * POST /api/escrows/projects/{projectId}/lock
   */
  lockProjectEscrow(projectId) {
    return axiosInstance.post(`/escrows/projects/${projectId}/lock`);
  },
};

export default escrowApi;