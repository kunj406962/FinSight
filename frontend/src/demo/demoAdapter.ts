import type { AxiosAdapter } from "axios";
import { resolveDemoRequest } from "./demoResolver";

export const demoAdapter: AxiosAdapter = async (config) => {
  try {
    const result = resolveDemoRequest(config.method ?? "get", config.url ?? "", config.params);
    return {
      data: result.data,
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Demo request failed.";
    return Promise.reject({
      config,
      isAxiosError: true,
      message,
      response: {
        status: 403,
        statusText: "Forbidden",
        data: { detail: message },
        headers: {},
        config,
      },
    });
  }
};