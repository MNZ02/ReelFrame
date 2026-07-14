import { createApp } from "./app";
import { env } from "./env";

const app = createApp();

console.log(`[api] listening on :${env.API_PORT} (provider=${env.VIDEO_PROVIDER})`);

export default {
  port: env.API_PORT,
  fetch: app.fetch,
};
