import axiosInstance from "./axiosInstance";

const uploadApi = {
  uploadImage(file, purpose = "avatar") {
    const formData = new FormData();

    // Phải đúng tên property backend đang đọc: request.File
    formData.append("File", file);

    // Backend dùng request.Purpose để phân folder: avatar/certificate/images
    formData.append("Purpose", purpose);

    return axiosInstance.post("/uploads/images", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};

export default uploadApi;