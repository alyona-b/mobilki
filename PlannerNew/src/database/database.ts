import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Открытие базы данных
 */
const db = SQLite.openDatabaseSync('planner.db');

/**
 * Проверка подключения к БД
 */
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    const result = await db.getFirstAsync<{ test: number }>('SELECT 1 as test');
    return result?.test === 1;
  } catch (error) {
    console.error('❌ Ошибка подключения к БД:', error);
    return false;
  }
};

/**
 * Проверка существования и структуры таблицы users
 */
export const checkUsersTable = async (): Promise<boolean> => {
  try {
    const tables = await db.getAllAsync(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='users'
    `);

    if (tables.length === 0) {
      console.warn('⚠️ Таблица users не найдена');
      return false;
    }

    const columns = await db.getAllAsync(`PRAGMA table_info(users)`);
    console.log('📋 Структура таблицы users:');
    columns.forEach((col: any) => {
      console.log(`  ${col.name} (${col.type})`);
    });

    return true;
  } catch (error) {
    console.error('❌ Ошибка проверки таблицы users:', error);
    return false;
  }
};

/**
 * Создание всех таблиц и индексов
 */
const createAllTables = async (): Promise<void> => {
  try {
    console.log('🔄 Создание таблиц...');

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        local_id TEXT UNIQUE,
        auth_token TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

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

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        local_id TEXT UNIQUE,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        priority TEXT DEFAULT 'low',
        date TEXT,
        start_time TEXT,
        end_time TEXT,
        completed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        sync_status TEXT DEFAULT 'synced',
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

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

    console.log('🔄 Создание индексов...');

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

    console.log('✅ Таблицы и индексы созданы');
  } catch (error) {
    console.error('❌ Ошибка создания таблиц:', error);
    throw error;
  }
};

/**
 * Миграция БД (parent_folder_id)
 */
const migrateDatabaseIfNeeded = async (currentVersion: number): Promise<number> => {
  try {
    if (currentVersion >= 2) {
      return currentVersion;
    }

    const tables = await db.getAllAsync(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='folders'
    `);

    if (tables.length === 0) {
      return currentVersion;
    }

    const columns = await db.getAllAsync(`PRAGMA table_info(folders)`);
    const hasParent = columns.some((c: any) => c.name === 'parent_folder_id');

    if (hasParent) {
      return currentVersion;
    }

    console.log('🔄 Миграция: parent_folder_id');

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

    await db.execAsync(`
      INSERT INTO folders_new (id, local_id, user_id, name, created_at, sync_status)
      SELECT id, local_id, user_id, name, created_at, sync_status FROM folders;
    `);

    await db.execAsync(`DROP TABLE folders;`);
    await db.execAsync(`ALTER TABLE folders_new RENAME TO folders;`);
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_folder_id);`);

    console.log('✅ Миграция завершена');

    return 2;
  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
    return currentVersion;
  }
};

/**
 * Восстановление БД
 */
const recoverDatabase = async (): Promise<void> => {
  console.warn('🔄 Восстановление базы данных...');

  await AsyncStorage.setItem('last_db_recovery', new Date().toISOString());

  const tables = await db.getAllAsync(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `);

  for (const t of tables) {
    await db.execAsync(`DROP TABLE IF EXISTS ${(t as any).name}`);
  }

  await createAllTables();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS db_metadata (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  await db.runAsync(`
    INSERT OR REPLACE INTO db_metadata (id, version, created_at)
    VALUES (1, 1, datetime('now'))
  `);

  console.log('✅ База данных восстановлена');
};

/**
 * Инициализация БД
 */
export const initDatabase = async (): Promise<void> => {
  try {
    console.log('🔄 Инициализация БД...');

    await db.execAsync(`PRAGMA journal_mode = WAL;`);
    await db.execAsync(`PRAGMA foreign_keys = ON;`);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS db_metadata (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        version INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    let version = 1;
    const meta = await db.getFirstAsync<{ version: number }>(
      `SELECT version FROM db_metadata WHERE id = 1`
    );
    if (meta?.version) version = meta.version;

    await createAllTables();

    const newVersion = await migrateDatabaseIfNeeded(version);

    await db.runAsync(`
      INSERT OR REPLACE INTO db_metadata (id, version, updated_at)
      VALUES (1, ?, datetime('now'))
    `, [newVersion]);

    const ok = await checkDatabaseConnection();
    const usersOk = await checkUsersTable();

    if (!ok || !usersOk) {
      await recoverDatabase();
    }

    await AsyncStorage.setItem('db_initialized', 'true');
    await AsyncStorage.setItem('last_db_init', new Date().toISOString());

    console.log('✅ База данных инициализирована');
  } catch (error) {
    console.error('❌ Критическая ошибка БД:', error);
    await recoverDatabase();
    await AsyncStorage.setItem('db_recovered', 'true');
  }
};

/**
 * Сброс БД (dev)
 */
export const resetDatabase = async (): Promise<void> => {
  console.warn('⚠️ Сброс базы данных');

  await db.execAsync(`DROP TABLE IF EXISTS sync_queue`);
  await db.execAsync(`DROP TABLE IF EXISTS notes`);
  await db.execAsync(`DROP TABLE IF EXISTS tasks`);
  await db.execAsync(`DROP TABLE IF EXISTS folders`);
  await db.execAsync(`DROP TABLE IF EXISTS users`);
  await db.execAsync(`DROP TABLE IF EXISTS db_metadata`);

  await createAllTables();

  await AsyncStorage.multiRemove([
    'db_initialized',
    'last_db_init',
    'db_recovered',
  ]);

  console.log('✅ БД сброшена');
};

/**
 * Экспорт БД
 */
export default db;
