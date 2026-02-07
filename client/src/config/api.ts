export const API_PORT = import.meta.env.PROD ? 2620 : 2026;
export const API_BASE_URL = `http://localhost:${API_PORT}`;
export const WS_BASE_URL = `ws://localhost:${API_PORT}`;
