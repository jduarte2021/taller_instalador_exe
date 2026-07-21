import prisma from '../db.js';
import { createLog } from './log.controller.js';
import { encryptTaskFields, decryptTask, encrypt } from '../lib/crypto.js';

// Campos include reutilizables para populate equivalente
const taskInclude = {
  assignedTo: { select: { nombres: true, apellidos: true } },
  createdBy:  { select: { username: true } },
  editedBy:   { select: { username: true } },
};

// Sanitiza el body antes de enviar a Prisma
function sanitizeTaskBody(body) {
  const data = { ...body };
  // Eliminar campos que no pertenecen a Task o que maneja Prisma internamente
  delete data._id;
  delete data.id;
  delete data.__v;
  delete data.user;
  delete data.createdBy;
  delete data.editedBy;
  delete data.assignedTo;
  // Manejar relaciones opcionales
  data.assignedToId = data.assignedToId && data.assignedToId !== '' ? data.assignedToId : null;
  data.editedById   = data.editedById   && data.editedById   !== '' ? data.editedById   : null;
  // servicePrice como número
  if (data.servicePrice !== undefined) data.servicePrice = Number(data.servicePrice) || 0;
  // date como Date si viene como string
  if (data.date) data.date = new Date(data.date);
  return data;
}

export const getTasks = async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({ include: taskInclude });
    res.json(tasks.map(decryptTask));
  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const createTask = async (req, res) => {
  try {
    const lastTask = await prisma.task.findFirst({ orderBy: { orderNumber: 'desc' } });
    const newOrderNumber = lastTask?.orderNumber ? lastTask.orderNumber + 1 : 1001;

    const body = encryptTaskFields(sanitizeTaskBody(req.body));

    const newTask = await prisma.task.create({
      data: {
        ...body,
        orderNumber: newOrderNumber,
        userId:      req.user.id,
        createdById: req.user.id,
      },
      include: taskInclude,
    });

    const u = await prisma.user.findUnique({ where: { id: req.user.id } });
    await createLog('CREATE_TASK', `Orden #${newOrderNumber} creada para cliente ${req.body.clientNombres} ${req.body.clientApellidos}`, req.user.id, u?.username, req.ip, { orderNumber: newOrderNumber });
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor: ' + error.message });
  }
};

export const getTask = async (req, res) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id }, include: taskInclude });
    if (!task) return res.status(404).json({ message: 'Tarea no encontrada' });
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ message: 'Tarea no encontrada' });

    await prisma.task.delete({ where: { id: req.params.id } });

    const u = await prisma.user.findUnique({ where: { id: req.user.id } });
    await createLog('DELETE_TASK', `Orden #${task.orderNumber} eliminada (cliente: ${task.clientNombres} ${task.clientApellidos})`, req.user.id, u?.username, req.ip, { orderNumber: task.orderNumber });
    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const updateTask = async (req, res) => {
  try {
    const body = encryptTaskFields(sanitizeTaskBody(req.body));
    body.editedById = req.user.id;

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data:  body,
      include: taskInclude,
    });

    const u = await prisma.user.findUnique({ where: { id: req.user.id } });
    await createLog('UPDATE_TASK', `Orden #${task.orderNumber} editada`, req.user.id, u?.username, req.ip, { orderNumber: task.orderNumber });
    res.json(decryptTask(task));
  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor: ' + error.message });
  }
};

export const markTaskAsCompleted = async (req, res) => {
  try {
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data:  { status: 'completada' },
      include: taskInclude,
    });

    const u = await prisma.user.findUnique({ where: { id: req.user.id } });
    await createLog('COMPLETE_TASK', `Orden #${task.orderNumber} marcada como completada`, req.user.id, u?.username, req.ip);
    res.json(decryptTask(task));
  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const searchTasksByCarPlate = async (req, res) => {
  try {
    const { carPlate } = req.query;
    if (!carPlate) return res.status(400).json({ message: 'Debe proporcionar una patente válida' });

    const tasks = await prisma.task.findMany({
      where:   { carPlate: carPlate.trim().toUpperCase() },
      include: taskInclude,
    });
    if (tasks.length === 0) return res.status(404).json({ message: 'No se encontraron tareas con esa patente' });
    res.json(tasks.map(decryptTask));
  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const searchTasksByClientName = async (req, res) => {
  try {
    const { clientName } = req.query;
    if (!clientName?.trim()) return res.status(400).json({ message: "El parámetro 'clientName' es requerido." });

    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { clientNombres:   { contains: clientName } },
          { clientApellidos: { contains: clientName } },
        ]
      },
      include: taskInclude,
    });
    if (tasks.length === 0) return res.status(404).json({ message: 'No se encontraron tareas para el cliente especificado.' });
    res.json(tasks.map(decryptTask));
  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const searchTasksByPhone = async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone?.trim()) return res.status(400).json({ message: "El parámetro 'phone' es requerido." });

    const tasks = await prisma.task.findMany({
      where:   { clientPhone: { contains: phone.trim() } },
      include: taskInclude,
    });
    if (tasks.length === 0) return res.status(404).json({ message: 'No se encontraron tareas para ese teléfono.' });
    res.json(tasks.map(decryptTask));
  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const searchTasksByOrderNumber = async (req, res) => {
  try {
    const { orderNumber } = req.query;
    if (!orderNumber?.trim()) return res.status(400).json({ message: "El parámetro 'orderNumber' es requerido." });

    const num = parseInt(orderNumber.trim());
    if (isNaN(num)) return res.status(400).json({ message: 'El número de orden debe ser un número válido.' });

    const tasks = await prisma.task.findMany({
      where:   { orderNumber: num },
      include: taskInclude,
    });
    if (tasks.length === 0) return res.status(404).json({ message: 'No se encontró ninguna orden con ese número.' });
    res.json(tasks.map(decryptTask));
  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

