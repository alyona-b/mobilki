import db from './database';
import { Task } from '../types';

export const taskService = {
  // Создать задачу
  async createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    try {
      const result = await db.runAsync(
        `INSERT INTO tasks (local_id, user_id, content, priority, date, start_time, end_time, completed, sync_status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          task.local_id,
          task.user_id,
          task.content,
          task.priority,
          task.date || null,
          task.start_time || null,
          task.end_time || null,
          task.completed ? 1 : 0,
          task.sync_status
        ]
      );
      return result.lastInsertRowId as number;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  },

  // Получить задачи пользователя
  async getTasksByUser(userId: number): Promise<Task[]> {
    try {
      const tasks = await db.getAllAsync(
        `SELECT * FROM tasks WHERE user_id = ? ORDER BY 
         CASE priority WHEN 'high' THEN 1 ELSE 2 END, 
         COALESCE(date, created_at) ASC,
         COALESCE(start_time, '23:59') ASC`,
        [userId]
      );
      
      return tasks.map((task: any) => ({
        ...task,
        completed: task.completed === 1
      }));
    } catch (error) {
      console.error('Error getting tasks:', error);
      throw error;
    }
  },

  // Получить задачи по дате
  async getTasksByDate(userId: number, date: string): Promise<Task[]> {
    try {
      const tasks = await db.getAllAsync(
        `SELECT * FROM tasks WHERE user_id = ? AND date = ? 
         ORDER BY 
         CASE priority WHEN 'high' THEN 1 ELSE 2 END,
         COALESCE(start_time, '23:59') ASC`,
        [userId, date]
      );
      
      return tasks.map((task: any) => ({
        ...task,
        completed: task.completed === 1
      }));
    } catch (error) {
      console.error('Error getting tasks by date:', error);
      throw error;
    }
  },

  // Получить задачи по месяцу
  async getTasksByMonth(userId: number, year: number, month: number): Promise<Task[]> {
    try {
      const monthStr = month.toString().padStart(2, '0');
      const startDate = `${year}-${monthStr}-01`;
      
      // Получаем последний день месяца
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${monthStr}-${lastDay.toString().padStart(2, '0')}`;
      
      const tasks = await db.getAllAsync(
        `SELECT * FROM tasks 
         WHERE user_id = ? 
           AND date >= ? 
           AND date <= ?
           AND completed = 0
         ORDER BY date, COALESCE(start_time, '00:00')`,
        [userId, startDate, endDate]
      );
      
      return tasks.map((task: any) => ({
        ...task,
        completed: task.completed === 1
      }));
    } catch (error) {
      console.error('Error getting tasks by month:', error);
      throw error;
    }
  },

  // Обновить задачу
  async updateTask(taskId: number, updates: Partial<Task>): Promise<void> {
    try {
      const fields = [];
      const values = [];

      if (updates.content !== undefined) {
        fields.push('content = ?');
        values.push(updates.content);
      }
      if (updates.priority !== undefined) {
        fields.push('priority = ?');
        values.push(updates.priority);
      }
      if (updates.date !== undefined) {
        fields.push('date = ?');
        values.push(updates.date);
      }
      if (updates.start_time !== undefined) {
        fields.push('start_time = ?');
        values.push(updates.start_time);
      }
      if (updates.end_time !== undefined) {
        fields.push('end_time = ?');
        values.push(updates.end_time);
      }
      if (updates.completed !== undefined) {
        fields.push('completed = ?');
        values.push(updates.completed ? 1 : 0);
      }

      fields.push('updated_at = datetime("now")');
      fields.push('sync_status = ?');
      values.push('pending');

      values.push(taskId);

      await db.runAsync(
        `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  },

  // Удалить задачу
  async deleteTask(taskId: number): Promise<void> {
    try {
      await db.runAsync('DELETE FROM tasks WHERE id = ?', [taskId]);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  },

  // Получить задачу по ID
  async getTaskById(taskId: number): Promise<Task | null> {
    try {
      const task = await db.getFirstAsync(
        'SELECT * FROM tasks WHERE id = ?',
        [taskId]
      );
      
      if (!task) return null;
      
      return {
        ...task,
        completed: task.completed === 1
      };
    } catch (error) {
      console.error('Error getting task by id:', error);
      throw error;
    }
  },

  // Получить просроченные задачи (опционально)
  async getOverdueTasks(userId: number): Promise<Task[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const tasks = await db.getAllAsync(
        `SELECT * FROM tasks 
         WHERE user_id = ? 
           AND date < ? 
           AND completed = 0
         ORDER BY date ASC`,
        [userId, today]
      );
      
      return tasks.map((task: any) => ({
        ...task,
        completed: task.completed === 1
      }));
    } catch (error) {
      console.error('Error getting overdue tasks:', error);
      throw error;
    }
  },

  // Получить задачи на сегодня (опционально)
  async getTodayTasks(userId: number): Promise<Task[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      return this.getTasksByDate(userId, today);
    } catch (error) {
      console.error('Error getting today tasks:', error);
      throw error;
    }
  }
};