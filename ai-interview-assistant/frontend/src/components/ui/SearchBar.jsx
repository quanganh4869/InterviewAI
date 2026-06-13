import { Search } from "lucide-react";

export function SearchBar({
  value,
  onChange,
  placeholder = "Tìm kiếm...",
  className = "",
  inputClassName = "",
  ...rest
}) {
  return (
    <label className={`search-bar ${className}`.trim()}>
      <Search aria-hidden="true" />
      <input
        type="search"
        className={`ds-input ${inputClassName}`.trim()}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        {...rest}
      />
    </label>
  );
}
