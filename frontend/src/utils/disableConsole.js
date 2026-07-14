export default function disableConsole() {
  // Chỉ chạy ở Production
  if (!import.meta.env.PROD) return;

  const noop = () => {};

  const methods = [
    "log",
    "info",
    "warn",
    "error",
    "debug",
    "trace",
    "dir",
    "table",
    "group",
    "groupCollapsed",
    "groupEnd",
    "count",
    "time",
    "timeEnd",
    "clear",
  ];

  methods.forEach((method) => {
    if (typeof console[method] === "function") {
      console[method] = noop;
    }
  });
}