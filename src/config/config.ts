import type { ProxyConfig } from "../types";

export const config: ProxyConfig = {
  STREAM_BASE_URL: "https://test-streams.mux.dev/x36xhzz",
  PORT: 3000,
  CACHE_DURATION: {
    MANIFEST: 1,
    SEGMENT: 86400,
  },
};
