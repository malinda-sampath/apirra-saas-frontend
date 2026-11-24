import React from "react";

type UserInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

const UserInput: React.FC<UserInputProps> = ({
  label = "User Input",
  className = "",
  id,
  ...props
}) => {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          {label}
        </label>
      )}
      <input id={inputId} type="text" className={`field ${className}`} {...props} />
    </div>
  );
};

export default UserInput;
