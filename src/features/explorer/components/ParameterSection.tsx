import React from "react";
import type { OpenAPIV3 } from "openapi-types";
import ParameterInput from "./ParameterInput";

type ParameterSectionProps = {
  title: string;
  params: OpenAPIV3.ParameterObject[];
  paramValues: Record<string, string>;
  onParamChange: (paramName: string, value: string) => void;
  disabled?: boolean;
  loading?: boolean;
};

const ParameterSection: React.FC<ParameterSectionProps> = ({
  title,
  params,
  paramValues,
  onParamChange,
  disabled = false,
  loading = false,
}) => {
  if (params.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-muted">{title}</h3>
      <div className="panel divide-y divide-line">
        {params.map((p, i) => (
          <div
            key={i}
            className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:items-start sm:gap-6"
          >
            <div className="min-w-0 sm:pt-2">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <code className="break-all font-mono text-[13px] font-semibold text-ink">
                  {p.name}
                </code>
                {p.required && (
                  <span className="text-xs font-medium text-danger">
                    required
                  </span>
                )}
              </div>
              <p className="mt-0.5 font-mono text-[11px] text-faint">
                {(p.schema as OpenAPIV3.SchemaObject | undefined)?.type ??
                  "string"}
              </p>
            </div>

            <div className="min-w-0">
              <ParameterInput
                param={p}
                value={paramValues[p.name] ?? ""}
                onChange={(value) => onParamChange(p.name, value)}
                disabled={disabled}
                loading={loading}
              />

              {p.description && (
                <p className="mt-1.5 text-xs leading-relaxed text-muted">
                  {p.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParameterSection;
