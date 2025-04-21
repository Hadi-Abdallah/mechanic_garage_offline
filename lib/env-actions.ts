"use server"

export async function getEnvVariables() {
  return {
    KV_URL: process.env.KV_URL || "Not set",
    KV_REST_API_URL: process.env.KV_REST_API_URL || "Not set",
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ||"Not set",
    KV_REST_API_READ_ONLY_TOKEN: process.env.KV_REST_API_READ_ONLY_TOKEN || "Not set",
  }
}

