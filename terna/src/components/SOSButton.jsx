import { useState } from "react";
import "./SOSButton.css";
import Toast from "./Toast";
import ConfirmDialog from "./ConfirmDialog";
import { useLanguage } from "../LanguageContext";

const SOSButton = () => {
  const { t } = useLanguage();
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const handleSOSClick = () => {
    setConfirmDialog({
      message: `${t("emergencyCall")}\n\n${t("emergencyConfirm")}`,
      onConfirm: () => {
        setConfirmDialog(null);
        window.location.href = "tel:108";

        setToast({
          message: t("callingEmergency"),
          type: "error",
        });
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
      <button className="sos-button" onClick={handleSOSClick}>
        {t("emergency")}
      </button>
    </>
  );
};

export default SOSButton;
