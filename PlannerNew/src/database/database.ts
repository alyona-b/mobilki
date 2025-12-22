import * as SQLite from 'expo-sqlite';

// Открываем базу данных
const db = SQLite.openDatabaseSync('planner.db');

// Инициализация базы данных
export const initDatabase = async (): Promise<void> => {
  try {
    // Включаем WAL mode
    await db.execAsync(`PRAGMA journal_mode = WAL;`);
    
    // Включаем поддержку внешних ключей
    await db.execAsync(`PRAGMA foreign_keys = ON;`);

    // Создаем таблицу для отслеживания версий БД (если еще не существует)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS db_metadata (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        version INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Проверяем текущую версию БД
    const metadata = await db.getFirstAsync<{version: number}>(`
      SELECT version FROM db_metadata WHERE id = 1;
    `);
    
    const currentVersion = metadata?.version || 1;
    console.log(`Current DB version: ${currentVersion}`);

    // Если это первый запуск (нет пользователей), создаем все таблицы
    const hasUsers = await db.getFirstAsync<{count: number}>(`
      SELECT COUNT(*) as count FROM users;
    `);

    if (!hasUsers || hasUsers.count === 0) {
      console.log('First launch, creating all tables...');
      await createAllTables();
      await db.runAsync(`
        INSERT OR REPLACE INTO db_metadata (id, version, created_at) 
        VALUES (1, 1, datetime('now'));
      `);
    } else {
      // База уже существует, применяем миграции если нужно
      console.log('Database exists, checking for migrations...');
      await migrateDatabaseIfNeeded(currentVersion);
    }

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.log('❌ Error initializing database:', error);
    throw error;
  }
};

// Создание всех таблиц (только при первом запуске)
const createAllTables = async (): Promise<void> => {
  // Таблица пользователей
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      local_id TEXT UNIQUE,
      auth_token TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Таблица папок (ДОБАВЛЕН parent_folder_id)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      local_id TEXT UNIQUE,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      parent_folder_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      sync_status TEXT DEFAULT 'synced',
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (parent_folder_id) REFERENCES folders (id) ON DELETE SET NULL
    );
  `);

  // Таблица заметок
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      local_id TEXT UNIQUE,
      user_id INTEGER NOT NULL,
      folder_id INTEGER,
      title TEXT,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      sync_status TEXT DEFAULT 'synced',
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE SET NULL
    );
  `);

  // Таблица задач
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      local_id TEXT UNIQUE,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      priority TEXT DEFAULT 'low',
      date TEXT, -- дата выполнения
      start_time TEXT, -- время начала (формат: "HH:MM")
      end_time TEXT, -- время окончания (формат: "HH:MM")
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      sync_status TEXT DEFAULT 'synced',
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);

  // Таблица для синхронизации
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      record_id INTEGER,
      local_id TEXT,
      operation TEXT NOT NULL,
      data TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Создаем индексы для оптимизации запросов
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_local_id ON users(local_id);
    
    CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
    CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_folder_id);
    CREATE INDEX IF NOT EXISTS idx_folders_local_id ON folders(local_id);
    
    CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
    CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id);
    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
    CREATE INDEX IF NOT EXISTS idx_notes_local_id ON notes(local_id);
    
    CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
    CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
    CREATE INDEX IF NOT EXISTS idx_tasks_local_id ON tasks(local_id);
    
    CREATE INDEX IF NOT EXISTS idx_sync_queue_table ON sync_queue(table_name);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue(created_at);
  `);

  console.log('✅ All tables created successfully with proper indexes');
};

// Проверка и применение миграций
const migrateDatabaseIfNeeded = async (currentVersion: number): Promise<void> => {
  try {
    // Проверяем, есть ли уже таблица folders
    const tables = await db.getAllAsync(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='folders';
    `);
    
    if (tables.length > 0) {
      // Проверяем, есть ли колонка parent_folder_id
      const columns = await db.getAllAsync(`PRAGMA table_info(folders)`);
      const hasParentFolderId = columns.some((col: any) => col.name === 'parent_folder_id');
      
      if (!hasParentFolderId) {
        console.log('🔄 Migrating database: adding parent_folder_id to folders table');
        
        // Создаем временную таблицу с новой структурой
        await db.execAsync(`
          CREATE TABLE folders_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            local_id TEXT UNIQUE,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            parent_folder_id INTEGER,
            created_at TEXT DEFAULT (datetime('now')),
            sync_status TEXT DEFAULT 'synced',
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (parent_folder_id) REFERENCES folders_new (id) ON DELETE SET NULL
          );
        `);
        
        // Копируем данные из старой таблицы
        await db.execAsync(`
          INSERT INTO folders_new (id, local_id, user_id, name, created_at, sync_status)
          SELECT id, local_id, user_id, name, created_at, sync_status FROM folders;
        `);
        
        // Удаляем старую таблицу и переименовываем новую
        await db.execAsync(`DROP TABLE folders;`);
        await db.execAsync(`ALTER TABLE folders_new RENAME TO folders;`);
        
        // Создаем индекс
        await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_folder_id);`);
        
        // Обновляем версию БД
        await db.runAsync(`
          UPDATE db_metadata SET version = 2, updated_at = datetime('now') WHERE id = 1;
        `);
        
        console.log('✅ Database migration completed successfully');
      } else {
        console.log('✅ Database already has parent_folder_id column');
      }
    }
  } catch (error) {
    console.log('❌ Error migrating database:', error);
    // Не бросаем ошибку, чтобы приложение могло работать
    // даже если миграция не удалась
  }
};

// Функция для проверки структуры БД
export const checkDatabaseStructure = async (): Promise<void> => {
  try {
    const tables = await db.getAllAsync(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
      ORDER BY name;
    `);
    console.log('Tables in database:', tables);

    // Проверяем структуру каждой таблицы
    for (const table of tables) {
      const tableName = (table as any).name;
      const structure = await db.getAllAsync(`PRAGMA table_info(${tableName})`);
      console.log(`\nStructure of ${tableName}:`);
      structure.forEach((col: any) => {
        console.log(`  ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
      });
    }

    // Проверяем индексы
    const indexes = await db.getAllAsync(`
      SELECT name, tbl_name, sql 
      FROM sqlite_master 
      WHERE type='index' 
      AND name NOT LIKE 'sqlite_autoindex_%'
      ORDER BY name;
    `);
    console.log('\nIndexes in database:', indexes);
  } catch (error) {
    console.log('Error checking database structure:', error);
  }
};

// Функция для миграции существующей базы данных (если нужно)
export const migrateDatabase = async (): Promise<void> => {
  try {
    // Проверяем, есть ли уже таблица folders
    const tables = await db.getAllAsync(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='folders';
    `);
    
    if (tables.length > 0) {
      // Проверяем, есть ли колонка parent_folder_id
      const columns = await db.getAllAsync(`PRAGMA table_info(folders)`);
      const hasParentFolderId = columns.some((col: any) => col.name === 'parent_folder_id');
      
      if (!hasParentFolderId) {
        console.log('🔄 Migrating database: adding parent_folder_id to folders table');
        
        // Создаем временную таблицу с новой структурой
        await db.execAsync(`
          CREATE TABLE folders_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            local_id TEXT UNIQUE,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            parent_folder_id INTEGER,
            created_at TEXT DEFAULT (datetime('now')),
            sync_status TEXT DEFAULT 'synced',
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (parent_folder_id) REFERENCES folders_new (id) ON DELETE SET NULL
          );
        `);
        
        // Копируем данные из старой таблицы
        await db.execAsync(`
          INSERT INTO folders_new (id, local_id, user_id, name, created_at, sync_status)
          SELECT id, local_id, user_id, name, created_at, sync_status FROM folders;
        `);
        
        // Удаляем старую таблицу и переименовываем новую
        await db.execAsync(`DROP TABLE folders;`);
        await db.execAsync(`ALTER TABLE folders_new RENAME TO folders;`);
        
        // Создаем индекс
        await db.execAsync(`CREATE INDEX idx_folders_parent_id ON folders(parent_folder_id);`);
        
        console.log('✅ Database migration completed successfully');
      } else {
        console.log('✅ Database already has parent_folder_id column');
      }
    }
  } catch (error) {
    console.log('❌ Error migrating database:', error);
    throw error;
  }
};

// Функция для сброса базы данных (для разработки)
export const resetDatabase = async (): Promise<void> => {
  try {
    console.warn('⚠️ Resetting database - all data will be lost!');
    
    // Удаляем существующие таблицы если есть (в правильном порядке из-за foreign keys)
    await db.execAsync(`DROP TABLE IF EXISTS sync_queue;`);
    await db.execAsync(`DROP TABLE IF EXISTS notes;`);
    await db.execAsync(`DROP TABLE IF EXISTS tasks;`);
    await db.execAsync(`DROP TABLE IF EXISTS folders;`);
    await db.execAsync(`DROP TABLE IF EXISTS users;`);
    await db.execAsync(`DROP TABLE IF EXISTS db_metadata;`);
    
    // Создаем таблицы заново
    await createAllTables();
    
    // Восстанавливаем таблицу метаданных
    await db.runAsync(`
      INSERT INTO db_metadata (id, version, created_at) 
      VALUES (1, 1, datetime('now'));
    `);
    
    console.log('✅ Database reset successfully');
  } catch (error) {
    console.log('❌ Error resetting database:', error);
    throw error;
  }
};

// Функция для проверки существования данных
export const checkDatabaseData = async (): Promise<void> => {
  try {
    const counts = await Promise.all([
      db.getFirstAsync(`SELECT COUNT(*) as count FROM users`) as Promise<{count: number}>,
      db.getFirstAsync(`SELECT COUNT(*) as count FROM folders`) as Promise<{count: number}>,
      db.getFirstAsync(`SELECT COUNT(*) as count FROM notes`) as Promise<{count: number}>,
      db.getFirstAsync(`SELECT COUNT(*) as count FROM tasks`) as Promise<{count: number}>,
    ]);
    
    console.log('📊 Database statistics:');
    console.log(`  Users: ${counts[0].count}`);
    console.log(`  Folders: ${counts[1].count}`);
    console.log(`  Notes: ${counts[2].count}`);
    console.log(`  Tasks: ${counts[3].count}`);
    
    // Показываем пример папок с parent_folder_id
    const folders = await db.getAllAsync(`
      SELECT id, name, parent_folder_id 
      FROM folders 
      ORDER BY name
      LIMIT 10
    `);
    console.log('\nSample folders:');
    folders.forEach((folder: any) => {
      console.log(`  ${folder.id}. ${folder.name} (parent: ${folder.parent_folder_id || 'none'})`);
    });
    
  } catch (error) {
    console.log('Error checking database data:', error);
  }
};

export default db;