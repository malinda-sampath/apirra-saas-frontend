import axios from "axios";
import type { ExecutePayload } from "../types";

export const executeRequest = async ({
  baseUrl,
  method,
  path,
  queryParams,
  headers,
  body,
}: ExecutePayload) => {
  const url = new URL(path, baseUrl);

  // Attach query params safely
  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  try {
    const response = await axios({
      url: url.toString(),
      method: method as import("axios").Method,
      headers,
      data: body,
    });

    return {
      success: true,
      status: response.status,
      data: response.data,
      headers: response.headers,
    };
  } catch (error: unknown) {
    const axiosError = error as {
      response?: { status?: number; data?: unknown };
      message?: string;
    };

    return {
      success: false,
      status: axiosError.response?.status,
      data: axiosError.response?.data,
      message: axiosError.message,
    };
  }
};
