declare module 'expo-sqlite' {
  export interface SQLiteRunResult {
    /**
     * The last inserted row ID.
     */
    lastInsertRowId: number;
    
    /**
     * The number of rows that were changed.
     */
    changes: number;
  }

  export interface SQLiteDatabase {
    /**
     * Execute all SQL queries in the supplied string.
     */
    execAsync(source: string): Promise<void>;
    
    /**
     * Execute a SQL query with parameters.
     */
    runAsync(sql: string, params?: any[]): Promise<SQLiteRunResult>;
    
    /**
     * Execute a SQL query with parameters and return the first result.
     */
    getFirstAsync<T = any>(sql: string, params?: any[]): Promise<T | null>;
    
    /**
     * Execute a SQL query with parameters and return all results.
     */
    getAllAsync<T = any>(sql: string, params?: any[]): Promise<T[]>;
    
    /**
     * Close the database connection.
     */
    closeAsync(): Promise<void>;
    
    /**
     * Delete the database file.
     */
    deleteAsync(): Promise<void>;
  }

  /**
   * Open a database, creating it if it doesn't exist.
   */
  export function openDatabaseSync(databaseName: string): SQLiteDatabase;
}