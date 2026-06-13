import { Children, isValidElement } from "react";
import "./Button.css";

function collectText(node, out) {
  if (node == null || typeof node === "boolean") return;
  if (typeof node === "string" || typeof node === "number") {
    out.push(String(node));
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((child) => collectText(child, out));
    return;
  }
  if (isValidElement(node)) {
    collectText(node.props?.children, out);
  }
}

function extractTooltip(children) {
  const parts = [];
  Children.toArray(children).forEach((child) => collectText(child, parts));
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export const Button = ({
  children,
  onClick,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  isLoading = false,
  icon: Icon,
  iconRight: IconRight,
  comingSoon = false,
  soonTitle,
  soonMessage,
  type = "button",
  dataTip,
  ...rest
}) => {
  const autoTip = extractTooltip(children);
  const resolvedTip = dataTip ?? (autoTip || undefined);
  const isBlocked = Boolean(comingSoon);
  const isDisabled = disabled || isLoading;

  const dispatchNotice = (detail) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("aiia:notice", { detail }));
  };

  const handleClick = (event) => {
    if (isBlocked) {
      event.preventDefault();
      event.stopPropagation();
      dispatchNotice({
        tone: "info",
        title: soonTitle || "Tính năng đang hoàn thiện",
        message: soonMessage || "Tính năng này chưa sẵn sàng để sử dụng.",
      });
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      type={type}
      className={`btn btn-${variant} btn-${size} ${className} ${isBlocked ? "is-disabled" : ""}`.trim()}
      onClick={handleClick}
      disabled={isDisabled && !isBlocked}
      aria-disabled={isBlocked ? "true" : undefined}
      aria-busy={isLoading ? "true" : undefined}
      data-tip={resolvedTip}
      {...rest}
    >
      {isLoading ? <span className="btn-spinner" aria-hidden="true" /> : null}
      {!isLoading && Icon ? <Icon size={16} aria-hidden="true" /> : null}
      {children}
      {!isLoading && IconRight ? <IconRight size={16} aria-hidden="true" /> : null}
    </button>
  );
};
