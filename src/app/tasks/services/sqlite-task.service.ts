import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

export interface Task {
  id?: number;
  name: string;
  description?: string;
  is_detail_required: boolean;
  child_form_fields?: any;
  status?: string;
  created_at?: Date;
  updated_at?: Date;
  needs_sync?: boolean;
}

export interface TaskDetail {
  id?: number;
  task_id: number;
  field_name: string;
  field_value: string;
  field_type: string;
  created_at?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SqliteTaskService {
  private sqlite: SQLiteConnection = new SQLiteConnection(CapacitorSQLite);
  private db: SQLiteDBConnection | null = null;
  private isDbInitialized = false;
  private readonly dbName = 'tasks_database.db';

  constructor() {
    this.initializeDatabase();
  }

  /**
   * Verifica si estamos en móvil
   */
  private isMobile(): boolean {
    const platform = Capacitor.getPlatform();
    return platform === 'android' || platform === 'ios';
  }

  /**
   * Inicializa la base de datos
   */
  private async initializeDatabase(): Promise<void> {
    if (this.isDbInitialized || !this.isMobile()) return;

    try {
      console.log('🔄 Initializing SQLite database...');

      // Crear conexión
      this.db = await this.sqlite.createConnection(
        this.dbName,
        false,
        'no-encryption',
        1,
        false
      );

      // Abrir base de datos
      await this.db.open();

      // Crear tablas
      await this.createTables();

      this.isDbInitialized = true;
      console.log('✅ SQLite database initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing SQLite database:', error);
      throw error;
    }
  }

  /**
   * Obtiene la conexión a la base de datos
   */
  private async getDatabase(): Promise<SQLiteDBConnection> {
    if (!this.isMobile()) {
      throw new Error('SQLite is only supported on mobile platforms');
    }

    if (!this.db) {
      await this.initializeDatabase();
    }

    if (!this.db) {
      throw new Error('Database connection failed');
    }

    return this.db;
  }

  /**
   * Crea las tablas necesarias
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tasksTableQuery = `
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        is_detail_required INTEGER DEFAULT 0,
        child_form_fields TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        needs_sync INTEGER DEFAULT 0
      );
    `;

    const taskDetailsTableQuery = `
      CREATE TABLE IF NOT EXISTS task_details (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        field_name TEXT NOT NULL,
        field_value TEXT,
        field_type TEXT DEFAULT 'text',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
      );
    `;

    await this.db.execute(tasksTableQuery);
    await this.db.execute(taskDetailsTableQuery);

    // Crear índices para mejor rendimiento
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_tasks_sync ON tasks (needs_sync);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_task_details_task_id ON task_details (task_id);');

    console.log('✅ Database tables created successfully');
  }

  /**
   * Obtiene todas las tareas
   */
  async getAllTasks(): Promise<Task[]> {
    if (!this.isMobile()) return [];

    try {
      const db = await this.getDatabase();
      const result = await db.query('SELECT * FROM tasks ORDER BY updated_at DESC');

      return result.values?.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        is_detail_required: Boolean(row.is_detail_required),
        child_form_fields: row.child_form_fields ? JSON.parse(row.child_form_fields) : null,
        status: row.status,
        created_at: row.created_at ? new Date(row.created_at) : undefined,
        updated_at: row.updated_at ? new Date(row.updated_at) : undefined,
        needs_sync: Boolean(row.needs_sync)
      })) || [];
    } catch (error) {
      console.error('❌ Error getting all tasks:', error);
      return [];
    }
  }

  /**
   * Obtiene una tarea por ID
   */
  async getTaskById(id: number): Promise<Task | null> {
    if (!this.isMobile()) return null;

    try {
      const db = await this.getDatabase();
      const result = await db.query('SELECT * FROM tasks WHERE id = ?', [id]);

      if (!result.values || result.values.length === 0) return null;

      const row = result.values[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        is_detail_required: Boolean(row.is_detail_required),
        child_form_fields: row.child_form_fields ? JSON.parse(row.child_form_fields) : null,
        status: row.status,
        created_at: row.created_at ? new Date(row.created_at) : undefined,
        updated_at: row.updated_at ? new Date(row.updated_at) : undefined,
        needs_sync: Boolean(row.needs_sync)
      };
    } catch (error) {
      console.error('❌ Error getting task by ID:', error);
      return null;
    }
  }

  /**
   * Crea una nueva tarea
   */
  async createTask(task: Omit<Task, 'id'>): Promise<Task | null> {
    if (!this.isMobile()) return null;

    try {
      const db = await this.getDatabase();

      const result = await db.run(
        `INSERT INTO tasks (name, description, is_detail_required, child_form_fields, status, needs_sync) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          task.name,
          task.description || '',
          task.is_detail_required ? 1 : 0,
          task.child_form_fields ? JSON.stringify(task.child_form_fields) : null,
          task.status || 'active',
          1 // Marcar como pendiente de sincronización
        ]
      );

      if (result.changes && result.changes.lastId) {
        return this.getTaskById(result.changes.lastId);
      }

      return null;
    } catch (error) {
      console.error('❌ Error creating task:', error);
      return null;
    }
  }

  /**
   * Actualiza una tarea existente
   */
  async updateTask(id: number, task: Partial<Task>): Promise<Task | null> {
    if (!this.isMobile()) return null;

    try {
      const db = await this.getDatabase();

      await db.run(
        `UPDATE tasks 
         SET name = ?, description = ?, is_detail_required = ?, child_form_fields = ?, 
             status = ?, updated_at = CURRENT_TIMESTAMP, needs_sync = 1 
         WHERE id = ?`,
        [
          task.name,
          task.description || '',
          task.is_detail_required ? 1 : 0,
          task.child_form_fields ? JSON.stringify(task.child_form_fields) : null,
          task.status || 'active',
          id
        ]
      );

      return this.getTaskById(id);
    } catch (error) {
      console.error('❌ Error updating task:', error);
      return null;
    }
  }

  /**
   * Elimina una tarea
   */
  async deleteTask(id: number): Promise<boolean> {
    if (!this.isMobile()) return false;

    try {
      const db = await this.getDatabase();

      // Eliminar detalles asociados primero
      await db.run('DELETE FROM task_details WHERE task_id = ?', [id]);

      // Eliminar la tarea
      const result = await db.run('DELETE FROM tasks WHERE id = ?', [id]);

      return result.changes?.changes ? result.changes.changes > 0 : false;
    } catch (error) {
      console.error('❌ Error deleting task:', error);
      return false;
    }
  }

  /**
   * Busca tareas por término
   */
  async searchTasks(searchTerm: string): Promise<Task[]> {
    if (!this.isMobile()) return [];

    try {
      const db = await this.getDatabase();
      const result = await db.query(
        'SELECT * FROM tasks WHERE name LIKE ? OR description LIKE ? ORDER BY updated_at DESC',
        [`%${searchTerm}%`, `%${searchTerm}%`]
      );

      return result.values?.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        is_detail_required: Boolean(row.is_detail_required),
        child_form_fields: row.child_form_fields ? JSON.parse(row.child_form_fields) : null,
        status: row.status,
        created_at: row.created_at ? new Date(row.created_at) : undefined,
        updated_at: row.updated_at ? new Date(row.updated_at) : undefined,
        needs_sync: Boolean(row.needs_sync)
      })) || [];
    } catch (error) {
      console.error('❌ Error searching tasks:', error);
      return [];
    }
  }

  /**
   * Sincroniza con datos del servidor
   */
  async syncWithServer(serverTasks: Task[]): Promise<void> {
    if (!this.isMobile()) return;

    try {
      const db = await this.getDatabase();

      // Obtener tareas locales
      const localTasks = await this.getAllTasks();
      const localTasksMap = new Map(localTasks.map(task => [task.id!, task]));

      // Actualizar/insertar tareas del servidor
      for (const serverTask of serverTasks) {
        if (serverTask.id) {
          const localTask = localTasksMap.get(serverTask.id);

          if (!localTask) {
            // Insertar nueva tarea del servidor
            await db.run(
              `INSERT INTO tasks (id, name, description, is_detail_required, child_form_fields, status, needs_sync) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                serverTask.id,
                serverTask.name,
                serverTask.description || '',
                serverTask.is_detail_required ? 1 : 0,
                serverTask.child_form_fields ? JSON.stringify(serverTask.child_form_fields) : null,
                serverTask.status || 'active',
                0 // No necesita sincronización porque viene del servidor
              ]
            );
          } else if (!localTask.needs_sync) {
            // Actualizar solo si no hay cambios locales pendientes
            await db.run(
              `UPDATE tasks 
               SET name = ?, description = ?, is_detail_required = ?, child_form_fields = ?, status = ?, needs_sync = 0 
               WHERE id = ?`,
              [
                serverTask.name,
                serverTask.description || '',
                serverTask.is_detail_required ? 1 : 0,
                serverTask.child_form_fields ? JSON.stringify(serverTask.child_form_fields) : null,
                serverTask.status || 'active',
                serverTask.id
              ]
            );
          }
        }
      }

      console.log('✅ Server sync completed successfully');
    } catch (error) {
      console.error('❌ Error syncing with server:', error);
      throw error;
    }
  }

  /**
   * Obtiene tareas pendientes de sincronización
   */
  async getTasksPendingSync(): Promise<Task[]> {
    if (!this.isMobile()) return [];

    try {
      const db = await this.getDatabase();
      const result = await db.query('SELECT * FROM tasks WHERE needs_sync = 1');

      return result.values?.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        is_detail_required: Boolean(row.is_detail_required),
        child_form_fields: row.child_form_fields ? JSON.parse(row.child_form_fields) : null,
        status: row.status,
        created_at: row.created_at ? new Date(row.created_at) : undefined,
        updated_at: row.updated_at ? new Date(row.updated_at) : undefined,
        needs_sync: Boolean(row.needs_sync)
      })) || [];
    } catch (error) {
      console.error('❌ Error getting tasks pending sync:', error);
      return [];
    }
  }

  /**
   * Marca una tarea como sincronizada
   */
  async markTaskAsSynced(id: number): Promise<void> {
    if (!this.isMobile()) return;

    try {
      const db = await this.getDatabase();
      await db.run('UPDATE tasks SET needs_sync = 0 WHERE id = ?', [id]);
    } catch (error) {
      console.error('❌ Error marking task as synced:', error);
    }
  }

  /**
   * Obtiene estadísticas de la base de datos
   */
  async getTaskStats(): Promise<{ total: number, active: number, inactive: number }> {
    if (!this.isMobile()) return { total: 0, active: 0, inactive: 0 };

    try {
      const db = await this.getDatabase();

      const totalResult = await db.query('SELECT COUNT(*) as count FROM tasks');
      const activeResult = await db.query('SELECT COUNT(*) as count FROM tasks WHERE status = ?', ['active']);
      const inactiveResult = await db.query('SELECT COUNT(*) as count FROM tasks WHERE status = ?', ['inactive']);

      return {
        total: totalResult.values?.[0]?.count || 0,
        active: activeResult.values?.[0]?.count || 0,
        inactive: inactiveResult.values?.[0]?.count || 0
      };
    } catch (error) {
      console.error('❌ Error getting task stats:', error);
      return { total: 0, active: 0, inactive: 0 };
    }
  }

  /**
   * Obtiene el número de tareas pendientes de sincronización
   */
  async getPendingSyncCount(): Promise<number> {
    if (!this.isMobile()) return 0;

    try {
      const db = await this.getDatabase();
      const result = await db.query('SELECT COUNT(*) as count FROM tasks WHERE needs_sync = 1');
      return result.values?.[0]?.count || 0;
    } catch (error) {
      console.error('❌ Error getting pending sync count:', error);
      return 0;
    }
  }

  /**
   * Limpia toda la caché de la base de datos
   */
  async clearCache(): Promise<void> {
    if (!this.isMobile()) return;

    try {
      const db = await this.getDatabase();

      // Limpiar tareas
      await db.run('DELETE FROM tasks');

      // Limpiar detalles
      await db.run('DELETE FROM task_details');

      console.log('✅ Local cache cleared');
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * Cierra la conexión de la base de datos
   */
  async closeDatabase(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.isDbInitialized = false;
      console.log('✅ Database connection closed');
    }
  }
}
