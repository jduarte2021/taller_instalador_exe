import axios from "../api/axios";
import Swal from "sweetalert2";

const isElectron = typeof window !== "undefined" && !!window.electronAPI;

export async function generateOrderPDF(task, theme = {}) {
  const bg    = theme.bgCard || "#1e293b";
  const color = theme.text   || "#f1f5f9";

  try {
    const response = await axios.post("/pdf/order", task, {
      responseType: "arraybuffer",
      withCredentials: true,
    });

    const clientName = `${task.clientNombres || ""}_${task.clientApellidos || ""}`
      .trim().replace(/\s+/g, "_") || "cliente";
    const filename = `orden_${task.orderNumber}_${clientName}.pdf`;

    if (isElectron) {
      const defaultFolder = localStorage.getItem("pdf_download_folder") || "";
      let result;

      if (defaultFolder) {
        // Carpeta configurada → guardar directo sin diálogo
        const sep      = defaultFolder.includes("/") ? "/" : "\\";
        const filePath = `${defaultFolder}${sep}${filename}`;
        result = await window.electronAPI.savePDFDirect(response.data, filePath);
      } else {
        // Sin carpeta → mostrar diálogo de guardado
        result = await window.electronAPI.savePDF(response.data, filename);
      }

      if (result.saved) {
        Swal.fire({
          title: "¡PDF guardado!",
          text: `Orden N° ${task.orderNumber} guardada correctamente.`,
          icon: "success",
          background: bg,
          color,
          timer: 2500,
          showConfirmButton: false,
        });
      }
      // Si canceló el diálogo → no mostrar nada
    } else {
      // Web: descarga clásica via <a>
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  } catch (error) {
    console.error("Error descargando PDF:", error);
    Swal.fire({
      title: "Error al generar PDF",
      text: error.response?.data?.message || error.message,
      icon: "error",
      background: bg,
      color,
    });
  }
}
