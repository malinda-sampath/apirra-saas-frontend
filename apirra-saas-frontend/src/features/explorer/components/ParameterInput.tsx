import React from "react";
import type { OpenAPIV3 } from "openapi-types";

type ParameterInputProps = {
  param: OpenAPIV3.ParameterObject;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
};

const ParameterInput: React.FC<ParameterInputProps> = ({
  param,
  value,
  onChange,
  disabled = false,
  loading = false,
}) => {
  const isDisabled = disabled || loading;
  const schema = param.schema as OpenAPIV3.SchemaObject | undefined;

  if (schema?.type === "boolean") {
    return (
      <select
        className="field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isDisabled}
        aria-label={`${param.name} input`}
      >
        <option value="">Select value</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }

  const isNumeric = schema?.type === "integer" || schema?.type === "number";

  return (
    <input
      type={isNumeric ? "number" : "text"}
      placeholder={param.description ?? `Enter ${param.name}`}
      className="field font-mono text-[13px]"
      required={param.required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onWheel={isNumeric ? (e) => e.currentTarget.blur() : undefined}
      disabled={isDisabled}
      aria-label={`${param.name} input`}
    />
  );
};

export default ParameterInput;
