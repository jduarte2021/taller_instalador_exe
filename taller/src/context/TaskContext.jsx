import { createContext, useContext, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { createTaskRequest, getTasksRequest } from "../api/task";
import axios from "../api/axios";

const TaskContext = createContext();

export const useTask = () => {
    const context = useContext(TaskContext);
    if (!context) {
        throw new Error("useTask must be used within a TaskProvider");
    }
    return context;
}

export function TaskProvider({ children }) {

    const [tasks, setTasks] = useState([]);

    // const getTasks = async () => {
    //     const res = getTaskRequest()
    //     console.log(res)
    // }

    const getTasks = useCallback(async () => {
        try {
            const { data } = await getTasksRequest();
            setTasks(data);
        } catch (error) {
            console.error("Error al obtener tareas:", error.response?.data || error.message);
        }
    }, []); // La función no cambiará en cada renderizado

    // const createTask = async (task) => {
    //     const res = await createTaskRequest(task)
    //     console.log(res)
    // }

    // const createTask = async (task) => {
    //     try {
    //         const res = await createTaskRequest(task);
    //         console.log("Tarea creada:", res.data); // Opcional: Para debug
    //         return res.data; // Retorna la tarea creada al llamador
    //     } catch (error) {
    //         console.error("Error al crear la tarea:", error.response?.data || error.message);
    //         throw error; // Lanza el error para manejarlo en el componente
    //     }
    // };
    
    const createTask = async (task) => {
        try {
            console.log("Datos enviados al servidor:", task); // Verifica qué se está enviando
            const res = await createTaskRequest(task);
            console.log("Tarea creada:", res.data); 
            return res.data;
        } catch (error) {
            console.error("Error al crear la tarea:", error.response?.data || error.message);
            throw error;
        }
    };
    


    const deleteTask = async (taskId) => {
        try {
            await axios.delete(
                `/tasks/${taskId}`,
                {
                    withCredentials: true, // Enviar cookies con la solicitud
                }
            );
            getTasks(); // Actualizar la lista de tareas después de la eliminación
        } catch (error) {
            console.error("Error al borrar la tarea:", error.message);
        }
    };

    const updateTask = async (taskId, updatedData) => {
        try {
            await axios.put(
                `/tasks/${taskId}`,
                updatedData,
                {
                    withCredentials: true, // Incluir cookies con la solicitud
                }
            );
            getTasks(); // Actualizar la lista de tareas después de la actualización
        } catch (error) {
            console.error("Error al actualizar la tarea:", error.message);
        }
    };


    return (
        <TaskContext.Provider value={{
            tasks,
            setTasks,
            createTask,
            getTasks,
            deleteTask,
            updateTask,
        }}>
            {children}
        </TaskContext.Provider>
    )
}

TaskProvider.propTypes = {
    children: PropTypes.node.isRequired, // Validar que `children` sea un nodo React
};
