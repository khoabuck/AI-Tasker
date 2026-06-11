import axiosInstance from "../api/axiosInstance";
import uploadApi from "../api/upload.api";

const getApiOrigin = () => {
  const baseUrl = axiosInstance.defaults.baseURL || "";

  return baseUrl.replace(/\/api\/?$/i, "").replace(/\/$/, "");
};

const toAbsoluteUrl = (url) => {
  if (!url) return "";

  if (String(url).startsWith("http://") || String(url).startsWith("https://")) {
    return url;
  }

  const apiOrigin = getApiOrigin();

  if (String(url).startsWith("/")) {
    return `${apiOrigin}${url}`;
  }

  return `${apiOrigin}/${url}`;
};

const extractImageUrl = (response) => {
  const data = response?.data?.data || response?.data || {};

  if (typeof data === "string") {
    return toAbsoluteUrl(data);
  }

  const possibleUrl =
    data.avatarUrl ||
    data.imageUrl ||
    data.fileUrl ||
    data.url ||
    data.path ||
    data.fullPath ||
    data.publicUrl ||
    data.secureUrl ||
    data.data?.avatarUrl ||
    data.data?.imageUrl ||
    data.data?.fileUrl ||
    data.data?.url ||
    data.data?.path ||
    data.data?.publicUrl ||
    data.data?.secureUrl;

  return toAbsoluteUrl(possibleUrl);
};

const uploadService = {
  async uploadImage(file, purpose = "avatar") {
    const response = await uploadApi.uploadImage(file, purpose);

    const imageUrl = extractImageUrl(response);

    if (!imageUrl) {
      console.log("UPLOAD RESPONSE:", response?.data);
      throw new Error("Upload image success but backend did not return image URL.");
    }

    return imageUrl;
  },
};

export default uploadService;