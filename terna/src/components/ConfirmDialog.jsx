 import "./ConfirmDialog.css";

const ConfirmDialog = ({ message, onConfirm, onCancel }) => {
  return (
    <div className="confirm-overlay">
      <div className="confirm-dialog">
        <div className="confirm-icon">
          <svg viewBox="0 0 24 24" width="64" height="64">
            <defs>
              <linearGradient
                id="warningGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop
                  offset="0%"
                  style={{ stopColor: "#dc3545", stopOpacity: 1 }}
                />
                <stop
                  offset="100%"
                  style={{ stopColor: "#c82333", stopOpacity: 1 }}
                />
              </linearGradient>
            </defs>
            <path
              fill="url(#warningGradient)"
              d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"
            />
          </svg>
        </div>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="confirm-btn confirm-yes" onClick={onConfirm}>
            Yes
          </button>
          <button className="confirm-btn confirm-no" onClick={onCancel}>
            No
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
