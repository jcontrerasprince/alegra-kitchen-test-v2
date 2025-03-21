import { Queue } from "bullmq";
import { redisConfig } from "../config/redis.config";

export const preparationsQueue = new Queue("preparationsQueue", {
  connection: redisConfig,
});
