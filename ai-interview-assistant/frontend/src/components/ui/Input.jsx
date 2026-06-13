import React from "react";
import "./Input.css";

export const Input = ({
  label,
  type = "text",
  placeholder = "",
  value,
  onChange,
  className = "",
  error,
  hint,
  ...rest
}) => {
  return (
    <div className={`input-wrapper ${className}`.trim()}>
      {label ? <label className="input-label">{label}</label> : null}
      <input
        className={`input-field ${error ? "has-error" : ""}`.trim()}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        aria-invalid={error ? "true" : undefined}
        {...rest}
      />
      {error ? <p className="input-message error">{error}</p> : null}
      {!error && hint ? <p className="input-message">{hint}</p> : null}
    </div>
  );
};

export const Textarea = ({
  label,
  placeholder = "",
  value,
  onChange,
  className = "",
  error,
  hint,
  rows = 4,
  ...rest
}) => {
  return (
    <div className={`input-wrapper ${className}`.trim()}>
      {label ? <label className="input-label">{label}</label> : null}
      <textarea
        className={`input-field input-textarea ${error ? "has-error" : ""}`.trim()}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={rows}
        aria-invalid={error ? "true" : undefined}
        {...rest}
      />
      {error ? <p className="input-message error">{error}</p> : null}
      {!error && hint ? <p className="input-message">{hint}</p> : null}
    </div>
  );
};

export const Select = ({
  label,
  value,
  onChange,
  children,
  className = "",
  error,
  hint,
  ...rest
}) => {
  return (
    <div className={`input-wrapper ${className}`.trim()}>
      {label ? <label className="input-label">{label}</label> : null}
      <select
        className={`input-field input-select ${error ? "has-error" : ""}`.trim()}
        value={value}
        onChange={onChange}
        aria-invalid={error ? "true" : undefined}
        {...rest}
      >
        {children}
      </select>
      {error ? <p className="input-message error">{error}</p> : null}
      {!error && hint ? <p className="input-message">{hint}</p> : null}
    </div>
  );
};
