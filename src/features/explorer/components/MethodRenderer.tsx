import type { ParsedApiMethod, ExecutePayload } from "../types";
import DeleteMethod from "./methods/DeleteMethod";
import GetMethod from "./methods/GetMethod";
import PostMethod from "./methods/PostMethod";
import PutMethod from "./methods/PutMethod";

type Props = {
  endpoint: ParsedApiMethod;
  onExecute: (payload: ExecutePayload) => Promise<unknown>;
  loading?: boolean;
  baseUrl?: string;
};

const MethodRenderer: React.FC<Props> = ({
  endpoint,
  onExecute,
  loading,
  baseUrl,
}) => {
  switch (endpoint.method) {
    case "get":
      return (
        <GetMethod
          endpoint={endpoint}
          onExecute={onExecute}
          loading={loading}
          baseUrl={baseUrl ?? ""}
        />
      );
    case "post":
      return (
        <PostMethod
          endpoint={endpoint}
          onExecute={onExecute}
          loading={loading}
          baseUrl={baseUrl ?? ""}
        />
      );
    case "put":
      return (
        <PutMethod
          endpoint={endpoint}
          onExecute={onExecute}
          loading={loading}
          baseUrl={baseUrl ?? ""}
        />
      );
    case "delete":
      return (
        <DeleteMethod
          endpoint={endpoint}
          onExecute={onExecute}
          loading={loading}
          baseUrl={baseUrl ?? ""}
        />
      );
    default:
      return (
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-8">
          <p className="text-sm text-muted">
            <code className="font-mono font-semibold text-ink">
              {endpoint.method.toUpperCase()}
            </code>{" "}
            requests can&apos;t be sent from Apirra yet.
          </p>
        </div>
      );
  }
};

export default MethodRenderer;
