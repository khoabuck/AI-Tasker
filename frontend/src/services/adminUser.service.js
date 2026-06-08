import adminUserApi from "../api/adminUser.api";

const adminUserService = {
  async getAllUsers() {
    const response = await adminUserApi.getAllUsers();

    if (Array.isArray(response.data)) {
      return response.data;
    }

    if (Array.isArray(response.data?.items)) {
      return response.data.items;
    }

    if (Array.isArray(response.data?.data)) {
      return response.data.data;
    }

    return [];
  },

  async updateUserStatus(userId, status) {
    const payload = {
      status: status,
    };

    const response = await adminUserApi.updateUserStatus(userId, payload);
    return response.data;
  },

  async updateUserRole(userId, role) {
    const payload = {
      role: role,
    };

    const response = await adminUserApi.updateUserRole(userId, payload);
    return response.data;
  },
};

export default adminUserService;