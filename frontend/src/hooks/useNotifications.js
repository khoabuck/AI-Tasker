// src/hooks/useNotifications.js
import { useState, useEffect, useCallback } from "react";
import axiosInstance from "../api/axiosInstance";

const POLL_INTERVAL = 5_000;

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/notifications/unread-count");
      setUnreadCount(res.data?.unreadCount ?? 0);
    } catch {}
  }, []);

  const fetchNotifications = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      const res = await axiosInstance.get("/notifications/me");
      const body = res.data;

      setNotifications(body.data ?? []);
      setUnreadCount(body.unreadCount ?? 0);
      setTotalCount(body.totalCount ?? 0);
    } catch (err) {
      console.error("Fetch notifications failed:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const markRead = useCallback(async (notificationId) => {
    try {
      await axiosInstance.post(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((n) =>
          n.notificationId === notificationId
            ? { ...n, isRead: true }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await axiosInstance.post("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    fetchNotifications(true);

    const intervalId = setInterval(() => {
      fetchUnreadCount();
      fetchNotifications(false);
    }, POLL_INTERVAL);

    return () => clearInterval(intervalId);
  }, [fetchUnreadCount, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    totalCount,
    loading,
    fetchNotifications,
    markRead,
    markAllRead,
  };
}