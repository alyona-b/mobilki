import db from './database';
import { Note, Folder, FolderWithNoteCount, NoteWithFolder } from '../types';

export const noteService = {
  // === ЗАМЕТКИ ===
  
  // Создание новой заметки (сохраняем NULL для пустого заголовка)
  createNote: async (note: Omit<Note, 'id' | 'created_at' | 'updated_at'>): Promise<number> => {
    try {
      // Преобразуем пустую строку в NULL
      const finalTitle = note.title && note.title.trim() !== '' ? note.title.trim() : null;
      
      console.log('Creating note with title:', finalTitle, 'folder_id:', note.folder_id);
      
      const result = await db.runAsync(
        `INSERT INTO notes (user_id, title, content, folder_id, sync_status, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'));`,
        [note.user_id, finalTitle, note.content, note.folder_id || null, note.sync_status || 'synced']
      );
      console.log('Note created with id:', result.lastInsertRowId);
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  },

  // Получение всех заметок пользователя (с фильтрацией по папке)
  getNotesByUser: async (userId: number, folderId?: number | null): Promise<Note[]> => {
    try {
      let query = 'SELECT * FROM notes WHERE user_id = ?';
      const params: any[] = [userId];
      
      if (folderId !== undefined) {
        // Если явно указан folderId (включая null)
        query += ' AND folder_id = ?';
        params.push(folderId);
      }
      // Если folderId не передан, НЕ добавляем фильтр - получаем ВСЕ заметки пользователя
      
      query += ' ORDER BY updated_at DESC;';
      
      const notes = await db.getAllAsync<Note>(query, params);
      console.log('Loaded notes for user', userId, 'folder', folderId, ':', notes.length);
      return notes;
    } catch (error) {
      console.error('Error getting notes:', error);
      throw error;
    }
  },

  // Получение заметок в конкретной папке
  getNotesByFolder: async (userId: number, folderId: number): Promise<Note[]> => {
    try {
      const query = 'SELECT * FROM notes WHERE user_id = ? AND folder_id = ? ORDER BY updated_at DESC;';
      const notes = await db.getAllAsync<Note>(query, [userId, folderId]);
      console.log('Notes in folder', folderId, ':', notes.length);
      return notes;
    } catch (error) {
      console.error('Error getting notes by folder:', error);
      throw error;
    }
  },

  // Получение заметок без папки (корневые заметки)
  getNotesWithoutFolder: async (userId: number): Promise<Note[]> => {
    try {
      const notes = await db.getAllAsync<Note>(
        'SELECT * FROM notes WHERE user_id = ? AND folder_id IS NULL ORDER BY updated_at DESC;',
        [userId]
      );
      console.log('Notes without folder:', notes.length);
      return notes;
    } catch (error) {
      console.error('Error getting notes without folder:', error);
      throw error;
    }
  },

  // Получение заметки по ID
  getNoteById: async (id: number): Promise<Note | null> => {
    try {
      return await db.getFirstAsync<Note>(
        'SELECT * FROM notes WHERE id = ?;',
        [id]
      );
    } catch (error) {
      console.error('Error getting note:', error);
      throw error;
    }
  },

  // Обновление заметки (сохраняем NULL для пустого заголовка)
  updateNote: async (id: number, updates: { title?: string | null; content?: string; folder_id?: number | null }): Promise<void> => {
    try {
      const setParts: string[] = [];
      const values: any[] = [];

      if (updates.title !== undefined) {
        setParts.push('title = ?');
        // Преобразуем пустую строку в NULL
        const finalTitle = updates.title && updates.title.trim() !== '' ? updates.title.trim() : null;
        values.push(finalTitle);
        console.log('Updating note with title:', finalTitle);
      }
      if (updates.content !== undefined) {
        setParts.push('content = ?');
        values.push(updates.content);
      }
      if (updates.folder_id !== undefined) {
        setParts.push('folder_id = ?');
        values.push(updates.folder_id);
        console.log('Updating note folder_id to:', updates.folder_id);
      }

      if (setParts.length === 0) {
        return;
      }

      setParts.push('updated_at = datetime("now")');
      setParts.push('sync_status = ?');
      values.push('pending');
      values.push(id);

      const setClause = setParts.join(', ');

      await db.runAsync(
        `UPDATE notes SET ${setClause} WHERE id = ?;`,
        values
      );
      console.log('Note updated successfully');
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  },

  // Удаление заметки
  deleteNote: async (id: number): Promise<void> => {
    try {
      await db.runAsync(
        'DELETE FROM notes WHERE id = ?;',
        [id]
      );
      console.log('Note deleted:', id);
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  },

  // Перемещение заметки в другую папку
  moveNoteToFolder: async (noteId: number, folderId: number | null): Promise<void> => {
    try {
      await db.runAsync(
        'UPDATE notes SET folder_id = ?, sync_status = ?, updated_at = datetime("now") WHERE id = ?;',
        [folderId, 'pending', noteId]
      );
      console.log('Moved note', noteId, 'to folder', folderId);
    } catch (error) {
      console.error('Error moving note:', error);
      throw error;
    }
  },

  // === ПАПКИ ===

  // Создание папки
  createFolder: async (folder: Omit<Folder, 'id' | 'created_at'>): Promise<number> => {
    try {
      const result = await db.runAsync(
        'INSERT INTO folders (user_id, name, parent_folder_id, sync_status, created_at) VALUES (?, ?, ?, ?, datetime("now"));',
        [folder.user_id, folder.name, folder.parent_folder_id || null, folder.sync_status || 'synced']
      );
      console.log('Folder created with id:', result.lastInsertRowId);
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  },

  // Получение всех папок пользователя
  getFoldersByUser: async (userId: number, parentFolderId?: number | null): Promise<Folder[]> => {
    try {
      let query = 'SELECT * FROM folders WHERE user_id = ?';
      const params: any[] = [userId];
      
      if (parentFolderId !== undefined) {
        // Если явно указан parentFolderId (включая null для корневых папок)
        query += ' AND parent_folder_id = ?';
        params.push(parentFolderId);
      }
      // Если parentFolderId не передан, получаем ВСЕ папки пользователя
      
      query += ' ORDER BY name COLLATE NOCASE ASC;';
      
      const folders = await db.getAllAsync<Folder>(query, params);
      console.log('Loaded folders for user', userId, 'parent', parentFolderId, ':', folders.length);
      return folders;
    } catch (error) {
      console.error('Error getting folders:', error);
      throw error;
    }
  },

  // Получение корневых папок (без родителя)
  getRootFolders: async (userId: number): Promise<Folder[]> => {
    try {
      const folders = await db.getAllAsync<Folder>(
        'SELECT * FROM folders WHERE user_id = ? AND parent_folder_id IS NULL ORDER BY name COLLATE NOCASE ASC;',
        [userId]
      );
      console.log('Root folders:', folders.length);
      return folders;
    } catch (error) {
      console.error('Error getting root folders:', error);
      throw error;
    }
  },

  // Получение подпапок
  getSubfolders: async (userId: number, parentFolderId: number): Promise<Folder[]> => {
    try {
      const folders = await db.getAllAsync<Folder>(
        'SELECT * FROM folders WHERE user_id = ? AND parent_folder_id = ? ORDER BY name COLLATE NOCASE ASC;',
        [userId, parentFolderId]
      );
      console.log('Subfolders of', parentFolderId, ':', folders.length);
      return folders;
    } catch (error) {
      console.error('Error getting subfolders:', error);
      throw error;
    }
  },

  // Получение папки по ID
  getFolderById: async (id: number): Promise<Folder | null> => {
    try {
      return await db.getFirstAsync<Folder>(
        'SELECT * FROM folders WHERE id = ?;',
        [id]
      );
    } catch (error) {
      console.error('Error getting folder by id:', error);
      throw error;
    }
  },

  // Получение папки по ID с дополнительной информацией
  getFolderWithDetails: async (userId: number, folderId: number): Promise<FolderWithNoteCount | null> => {
    try {
      const folder = await db.getFirstAsync<FolderWithNoteCount>(
        `SELECT f.*, 
                (SELECT COUNT(*) FROM notes n WHERE n.user_id = ? AND n.folder_id = f.id) as noteCount,
                (SELECT COUNT(*) FROM folders sf WHERE sf.user_id = ? AND sf.parent_folder_id = f.id) as subfolderCount
         FROM folders f
         WHERE f.id = ? AND f.user_id = ?;`,
        [userId, userId, folderId, userId]
      );
      return folder;
    } catch (error) {
      console.error('Error getting folder with details:', error);
      throw error;
    }
  },

  // Обновление папки
  updateFolder: async (id: number, updates: { name?: string; parent_folder_id?: number | null }): Promise<void> => {
    try {
      const setParts: string[] = [];
      const values: any[] = [];

      if (updates.name !== undefined) {
        setParts.push('name = ?');
        values.push(updates.name);
      }
      if (updates.parent_folder_id !== undefined) {
        setParts.push('parent_folder_id = ?');
        values.push(updates.parent_folder_id);
      }

      if (setParts.length === 0) {
        return;
      }

      setParts.push('sync_status = ?');
      values.push('pending');
      values.push(id);

      const setClause = setParts.join(', ');

      await db.runAsync(
        `UPDATE folders SET ${setClause} WHERE id = ?;`,
        values
      );
    } catch (error) {
      console.error('Error updating folder:', error);
      throw error;
    }
  },

  // Удаление папки и всего её содержимого
  deleteFolder: async (userId: number, folderId: number): Promise<void> => {
    try {
      // 1. Сначала получаем все подпапки (рекурсивно)
      const subfolders = await noteService.getAllSubfolders(userId, folderId);
      
      // 2. Удаляем все заметки в папке и подпапках
      const allFolderIds = [folderId, ...subfolders.map(f => f.id)];
      
      for (const id of allFolderIds) {
        // Удаляем заметки в этой папке
        await db.runAsync(
          'DELETE FROM notes WHERE folder_id = ? AND user_id = ?;',
          [id, userId]
        );
        
        // Удаляем папку (подпапки удалятся благодаря CASCADE или мы их удаляем по очереди)
        await db.runAsync(
          'DELETE FROM folders WHERE id = ? AND user_id = ?;',
          [id, userId]
        );
      }
      
      console.log('Deleted folder and all contents:', folderId);
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  },

  // Получение всех подпапок рекурсивно
  getAllSubfolders: async (userId: number, parentFolderId: number): Promise<Folder[]> => {
    try {
      const folders: Folder[] = [];
      
      const getSubfoldersRecursive = async (currentParentId: number) => {
        const directSubfolders = await noteService.getSubfolders(userId, currentParentId);
        
        for (const subfolder of directSubfolders) {
          folders.push(subfolder);
          await getSubfoldersRecursive(subfolder.id);
        }
      };
      
      await getSubfoldersRecursive(parentFolderId);
      return folders;
    } catch (error) {
      console.error('Error getting all subfolders:', error);
      throw error;
    }
  },

  // Получение количества заметок в папке
  getNoteCountByFolder: async (folderId: number | null): Promise<number> => {
    try {
      const result = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM notes WHERE folder_id = ?;',
        [folderId]
      );
      const count = result?.count || 0;
      console.log('Note count in folder', folderId, ':', count);
      return count;
    } catch (error) {
      console.error('Error getting note count by folder:', error);
      throw error;
    }
  },

  // Получение количества заметок в папке и её подпапках
  getTotalNoteCountInFolderTree: async (userId: number, folderId: number): Promise<number> => {
    try {
      // Получаем все подпапки
      const subfolders = await noteService.getAllSubfolders(userId, folderId);
      const allFolderIds = [folderId, ...subfolders.map(f => f.id)];
      
      // Считаем заметки во всех папках
      let totalCount = 0;
      for (const id of allFolderIds) {
        const count = await noteService.getNoteCountByFolder(id);
        totalCount += count;
      }
      
      return totalCount;
    } catch (error) {
      console.error('Error getting total note count in folder tree:', error);
      throw error;
    }
  },

  // Получение полного дерева папок с количеством заметок
  getFolderTreeWithCounts: async (userId: number): Promise<FolderWithNoteCount[]> => {
    try {
      // Рекурсивный запрос для получения всех папок с количеством заметок
      const folders = await db.getAllAsync<FolderWithNoteCount>(
        `WITH RECURSIVE folder_tree AS (
          SELECT 
            f.id, 
            f.name, 
            f.parent_folder_id, 
            f.created_at,
            f.sync_status,
            0 as level,
            (SELECT COUNT(*) FROM notes n WHERE n.user_id = ? AND n.folder_id = f.id) as noteCount
          FROM folders f
          WHERE f.user_id = ? AND f.parent_folder_id IS NULL
          
          UNION ALL
          
          SELECT 
            f.id, 
            f.name, 
            f.parent_folder_id, 
            f.created_at,
            f.sync_status,
            ft.level + 1 as level,
            (SELECT COUNT(*) FROM notes n WHERE n.user_id = ? AND n.folder_id = f.id) as noteCount
          FROM folders f
          INNER JOIN folder_tree ft ON f.parent_folder_id = ft.id
          WHERE f.user_id = ?
        )
        SELECT * FROM folder_tree ORDER BY level, name;`,
        [userId, userId, userId, userId]
      );
      console.log('Folder tree with counts loaded:', folders.length, 'folders');
      return folders;
    } catch (error) {
      console.error('Error getting folder tree with counts:', error);
      throw error;
    }
  },

  // Перемещение всех заметок из одной папки в другую
  moveAllNotesToFolder: async (userId: number, fromFolderId: number | null, toFolderId: number | null): Promise<void> => {
    try {
      await db.runAsync(
        'UPDATE notes SET folder_id = ?, sync_status = ?, updated_at = datetime("now") WHERE user_id = ? AND folder_id = ?;',
        [toFolderId, 'pending', userId, fromFolderId]
      );
      console.log('Moved all notes from', fromFolderId, 'to', toFolderId);
    } catch (error) {
      console.error('Error moving all notes to folder:', error);
      throw error;
    }
  },

  // === ПОИСК ===

  // Поиск заметок по тексту
  searchNotes: async (userId: number, searchText: string): Promise<Note[]> => {
    try {
      const notes = await db.getAllAsync<Note>(
        `SELECT * FROM notes 
         WHERE user_id = ? 
           AND (title LIKE ? OR content LIKE ?)
         ORDER BY updated_at DESC;`,
        [userId, `%${searchText}%`, `%${searchText}%`]
      );
      console.log('Search results for', searchText, ':', notes.length);
      return notes;
    } catch (error) {
      console.error('Error searching notes:', error);
      throw error;
    }
  },

  // Поиск заметок по тексту с информацией о папке
  searchNotesWithFolder: async (userId: number, searchText: string): Promise<NoteWithFolder[]> => {
    try {
      const notes = await db.getAllAsync<NoteWithFolder>(
        `SELECT 
           n.*,
           f.name as folder_name
         FROM notes n
         LEFT JOIN folders f ON n.folder_id = f.id AND n.user_id = f.user_id
         WHERE n.user_id = ? 
           AND (n.title LIKE ? OR n.content LIKE ?)
         ORDER BY n.updated_at DESC;`,
        [userId, `%${searchText}%`, `%${searchText}%`]
      );
      return notes;
    } catch (error) {
      console.error('Error searching notes with folder:', error);
      throw error;
    }
  },

  // Поиск папок по имени
  searchFolders: async (userId: number, searchText: string): Promise<Folder[]> => {
    try {
      const folders = await db.getAllAsync<Folder>(
        'SELECT * FROM folders WHERE user_id = ? AND name LIKE ? ORDER BY name;',
        [userId, `%${searchText}%`]
      );
      console.log('Folder search results:', folders.length);
      return folders;
    } catch (error) {
      console.error('Error searching folders:', error);
      throw error;
    }
  },

  // === СИНХРОНИЗАЦИЯ ===

  // Получение заметок, ожидающих синхронизации
  getPendingNotes: async (userId: number): Promise<Note[]> => {
    try {
      return await db.getAllAsync<Note>(
        'SELECT * FROM notes WHERE user_id = ? AND sync_status = ? ORDER BY updated_at;',
        [userId, 'pending']
      );
    } catch (error) {
      console.error('Error getting pending notes:', error);
      throw error;
    }
  },

  // Получение папок, ожидающих синхронизации
  getPendingFolders: async (userId: number): Promise<Folder[]> => {
    try {
      return await db.getAllAsync<Folder>(
        'SELECT * FROM folders WHERE user_id = ? AND sync_status = ? ORDER BY created_at;',
        [userId, 'pending']
      );
    } catch (error) {
      console.error('Error getting pending folders:', error);
      throw error;
    }
  },

  // Обновление статуса синхронизации заметки
  updateNoteSyncStatus: async (noteId: number, status: 'synced' | 'pending' | 'error'): Promise<void> => {
    try {
      await db.runAsync(
        'UPDATE notes SET sync_status = ? WHERE id = ?;',
        [status, noteId]
      );
    } catch (error) {
      console.error('Error updating note sync status:', error);
      throw error;
    }
  },

  // Обновление статуса синхронизации папки
  updateFolderSyncStatus: async (folderId: number, status: 'synced' | 'pending' | 'error'): Promise<void> => {
    try {
      await db.runAsync(
        'UPDATE folders SET sync_status = ? WHERE id = ?;',
        [status, folderId]
      );
    } catch (error) {
      console.error('Error updating folder sync status:', error);
      throw error;
    }
  },
};