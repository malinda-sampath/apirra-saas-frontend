import type { OpenAPISpec } from "../types";
import { explorerApi } from "./explorerApi";

export const fetchOpenApiSpec = async (url: string): Promise<OpenAPISpec> => {
  const response = await explorerApi.get<OpenAPISpec>(url);
  return response.data;
};
