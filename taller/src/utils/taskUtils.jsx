import axios from "../api/axios";
import Swal from "sweetalert2";
import html2pdf from "html2pdf.js";

// Función para marcar tarea como completada
export const handleCompleteTask = async (taskId, getTasks) => {
    try {
        await axios.put(`/tasks/${taskId}/complete`);
        Swal.fire({
            title: "¡Completado!",
            text: "La tarea se marcó como completada.",
            icon: "success",
            confirmButtonText: "Aceptar",
        });
        getTasks();
    } catch (error) {
        Swal.fire({
            title: "Error",
            text: "No se pudo marcar la tarea como completada.",
            icon: "error",
            confirmButtonText: "Aceptar",
        });
        console.error("Error al completar la tarea:", error);
    }
};

// Función para generar PDF
export const generatePDF = (taskId) => {
    const element = document.getElementById(`task-${taskId}`);
    const buttons = element.querySelectorAll(".no-print");
    buttons.forEach((button) => (button.style.display = "none"));

    const options = {
        margin: 10,
        filename: `tarea_${taskId}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    html2pdf()
        .set(options)
        .from(element)
        .save()
        .then(() => {
            buttons.forEach((button) => (button.style.display = ""));
        });
};

// Función para eliminar una tarea
export const handleDelete = (taskId, deleteTask, setTasks, tasks) => {
    Swal.fire({
        title: "¿Estás seguro?",
        text: "Esta acción no se puede deshacer",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
    }).then((result) => {
        if (result.isConfirmed) {
            deleteTask(taskId);
            setTasks(tasks.filter((task) => task._id !== taskId));
            Swal.fire("Eliminado", "La tarea ha sido eliminada con éxito.", "success");
        }
    });
};
