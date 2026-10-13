/** Integration boundaries. Demo mode never calls email, SMS, card or file-upload providers. */
export const notificationAdapter = {
  send: async () => ({ mode: "demonstration", delivered: false }),
};
export const uploadAdapter = {
  mode: "metadata-only" as const,
  maxBytes: 5 * 1024 * 1024,
  types: ["application/pdf", "image/jpeg", "image/png"],
};
export const paymentAdapter = {
  mode: "demonstration" as const,
  collectsCardDetails: false,
};
export const backendConfiguration = {
  mode: "mock" as const,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5144/api",
};
