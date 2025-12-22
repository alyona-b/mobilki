import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { taskService } from '../database/taskService';
import { useAuth } from '../contexts/AuthContext';
import { Task } from '../types';
import SimpleFAB from '../components/SimpleFAB';

interface TasksScreenProps {
  onNavigateToTaskEdit?: (taskId?: number, initialDate?: string, sourceScreen?: string) => void;
  onNavigateToNoteEdit?: (noteId?: number, sourceScreen?: string) => void;
}

const TasksScreen: React.FC<TasksScreenProps> = ({ 
  onNavigateToTaskEdit, 
  onNavigateToNoteEdit 
}) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, [user]);

  const loadTasks = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const userTasks = await taskService.getTasksByUser(user.id);
      setTasks(userTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить задачи');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskPress = (task: Task) => {
    onNavigateToTaskEdit?.(task.id);
  };

  const handleCreateTask = () => {
    onNavigateToTaskEdit?.();
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      // Локально обновляем состояние
      const updatedTasks = tasks.map(t => 
        t.id === task.id 
          ? { ...t, completed: !t.completed } 
          : t
      );
      setTasks(updatedTasks);
      
      // Асинхронно обновляем в базе данных
      await taskService.updateTask(task.id, {
        completed: !task.completed
      });
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Ошибка', 'Не удалось обновить задачу');
      // Откатываем изменения если ошибка
      loadTasks();
    }
  };

  

  const handleDeleteTask = (task: Task) => {
    Alert.alert(
      'Удалить задачу',
      `Вы уверены, что хотите удалить задачу?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await taskService.deleteTask(task.id);
              loadTasks();
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('Ошибка', 'Не удалось удалить задачу');
            }
          },
        },
      ]
    );
  };

  const getTaskDateText = (task: Task) => {
  let dateText = '';
  
  if (task.date) {
    dateText = new Date(task.date).toLocaleDateString('ru-RU');
  }
  
  // Добавляем время если есть
  if (task.start_time && task.end_time) {
    dateText = dateText ? `${dateText} ${task.start_time}-${task.end_time}` : `${task.start_time}-${task.end_time}`;
  } else if (task.start_time) {
    dateText = dateText ? `${dateText} ${task.start_time}` : task.start_time;
  }
  
  return dateText || 'Без даты';
};

  const renderTaskItem = ({ item }: { item: Task }) => (
  <TouchableOpacity
    style={[
      styles.taskCard,
      item.completed && styles.taskCardCompleted,
      item.priority === 'high' && styles.taskCardImportant
    ]}
    onPress={() => handleTaskPress(item)}
    onLongPress={() => handleDeleteTask(item)}
  >
    <View style={styles.taskHeader}>
      <TouchableOpacity
        style={[
          styles.checkbox,
          item.completed && styles.checkboxCompleted,
          item.priority === 'high' && styles.checkboxImportant,
          item.completed && item.priority === 'high' && styles.checkboxImportantCompleted
        ]}
        onPress={() => handleToggleComplete(item)}
      >
        {item.completed && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
      
      <View style={styles.taskContent}>
        <Text style={[
          styles.taskText,
          item.completed && styles.taskTextCompleted
        ]}>
          {item.content}
        </Text>
        
        <View style={styles.taskMeta}>
          <Text style={styles.taskDate}>
            {getTaskDateText(item)}
          </Text>
          {item.priority === 'high' && (
            <Text style={styles.priorityBadge}> </Text>
          )}
        </View>
      </View>
    </View>
  </TouchableOpacity>
);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Задачи</Text>
        <Text>Загрузка...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* <Text style={styles.title}>✅ Мои Задачи</Text> */}
      
      {tasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>У вас пока нет задач</Text>
          <Text style={styles.emptyStateSubtext}>
            Нажмите "+" чтобы создать первую задачу
          </Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTaskItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.tasksList}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      <SimpleFAB 
        onNotePress={() => {
          // Навигация к созданию заметки
          onNavigateToNoteEdit?.();
        }}
        onTaskPress={handleCreateTask}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2c3e50',
  },
  tasksList: {
    paddingBottom: 20,
  },
  taskCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  taskCardCompleted: {
    backgroundColor: '#f8f9fa',
    opacity: 0.7,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3498db',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#3498db',
  },
  checkmark: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  taskContent: {
    flex: 1,
  },
  taskText: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 8,
    lineHeight: 20,
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#6c757d',
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskDate: {
    fontSize: 12,
    color: '#adb5bd',
  },
  priorityBadge: {
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#6c757d',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
  },
  checkboxImportant: {
    borderColor: '#e74c3c',
  },
  checkboxImportantCompleted: {
    backgroundColor: '#e74c3c',
    borderColor: '#e74c3c',
  },
  taskCardImportant: {
    backgroundColor: '#ffeaea',
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  });

export default TasksScreen;