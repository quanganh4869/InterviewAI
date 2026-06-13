import React from "react";
import { X } from "lucide-react";
import "./Modal.css";

export const Modal = ({ isOpen, onClose, title, children, className = "" }) => {
  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${className}`.trim()} onClick={onClose}>
      <div className="modal-content" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          {title ? <h2 className="modal-title">{title}</h2> : <span />}
          <button className="modal-close" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};
