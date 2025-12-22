import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import CalendarComponent from '../components/CalendarComponent';
import SimpleFAB from '../components/SimpleFAB';
import { taskService } from '../database/taskService';
import { useAuth } from '../contexts/AuthContext';
import { Task } from '../types';

interface CalendarScreenProps {
  onNavigateToTaskEdit?: (taskId?: number, initialDate?: string, sourceScreen?: string) => void;
  onNavigateToNoteEdit?: (noteId?: number, sourceScreen?: string) => void;
}

const CalendarScreen: React.FC<CalendarScreenProps> = ({ 
  onNavigateToTaskEdit, 
  onNavigateToNoteEdit 
}) => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadTasksForDate = useCallback(async () => {
    if (!user || !selectedDate) return;

    try {
      const dateTasks = await taskService.getTasksByDate(user.id, selectedDate);
      setTasks(dateTasks);
    } catch (error) {
      console.error('Error loading tasks for date:', error);
    }
  }, [user, selectedDate]);

  useEffect(() => {
    if (selectedDate && user) {
      loadTasksForDate();
    }
  }, [selectedDate, user, loadTasksForDate]);

  const handleAddTask = () => {
    onNavigateToTaskEdit?.(undefined, selectedDate, 'calendar');
    // После возврата из редактирования обновим календарь
    setTimeout(() => {
      setRefreshKey(prev => prev + 1);
    }, 500);
  };

  const handleTaskPress = (task: Task) => {
    onNavigateToTaskEdit?.(task.id, undefined, 'calendar');
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTasksForDate();
    // Также обновляем календарь
    setRefreshKey(prev => prev + 1);
    setRefreshing(false);
  }, [loadTasksForDate]);

  const renderTaskItem = ({ item }: { item: Task }) => (
    <TouchableOpacity
      style={[
        styles.taskItem,
        item.priority === 'high' && styles.highPriorityTask
      ]}
      onPress={() => handleTaskPress(item)}
    >
      <View style={styles.taskContent}>
        <Text style={styles.taskText}>{item.content}</Text>
        <View style={styles.taskMeta}>
          {item.priority === 'high' && <Text style={styles.priorityIcon}></Text>}
          {item.start_time && (
            <Text style={styles.timeText}>
              ⏰ {item.start_time}
              {item.end_time && ` - ${item.end_time}`}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const getTaskCountText = () => {
    const count = tasks.length;
    if (count === 0) return 'нет задач';
    if (count === 1) return '1 задача';
    if (count >= 2 && count <= 4) return `${count} задачи`;
    return `${count} задач`;
  };

  return (
    <View style={styles.container}>
      <CalendarComponent 
        key={refreshKey}
        onDateSelect={setSelectedDate}
        selectedDate={selectedDate}
      />

      {selectedDate ? (
        <View style={styles.selectedDateContainer}>
          <View style={styles.dateHeader}>
            <Text style={styles.selectedDateText}>
              {new Date(selectedDate).toLocaleDateString('ru-RU', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </Text>
            <Text style={styles.taskCountText}>
              {getTaskCountText()}
            </Text>
          </View>
          
          {tasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.noTasksText}>На этот день задач нет</Text>
              <TouchableOpacity 
                style={styles.addTaskButton}
                onPress={handleAddTask}
              >
                <Text style={styles.addTaskButtonText}>
                  Создать задачу
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={tasks}
              renderItem={renderTaskItem}
              keyExtractor={(item) => item.id.toString()}
              style={styles.tasksList}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#3498db']}
                />
              }
              ListFooterComponent={
                <TouchableOpacity 
                  style={[styles.addTaskButton, styles.addTaskButtonBottom]}
                  onPress={handleAddTask}
                >
                  <Text style={styles.addTaskButtonText}>
                    Добавить еще задачу
                  </Text>
                </TouchableOpacity>
              }
            />
          )}
        </View>
      ) : (
        <View style={styles.hintContainer}>
          <Text style={styles.hint}>
            Выберите дату в календаре, чтобы посмотреть задачи
          </Text>
          <Text style={styles.hintSub}>
            Дни с точками имеют задачи
          </Text>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3498db' }]} />
              <Text style={styles.legendText}>Обычная задача</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#e74c3c' }]} />
              <Text style={styles.legendText}>Важная задача</Text>
            </View>
          </View>
        </View>
      )}

      <SimpleFAB 
        onNotePress={() => onNavigateToNoteEdit?.(undefined, 'calendar')}
        onTaskPress={() => onNavigateToTaskEdit?.(undefined, selectedDate || undefined, 'calendar')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#ffffff',
  },
  selectedDateContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 10,
    borderRadius: 10,
    flex: 1,
  },
  dateHeader: {
    marginBottom: 12,
  },
  selectedDateText: {
    fontSize: 18,
    color: '#2c3e50',
    fontWeight: '600',
  },
  taskCountText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  tasksList: {
    flex: 1,
  },
  taskItem: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  highPriorityTask: {
    borderLeftColor: '#e74c3c',
    backgroundColor: '#fff5f5',
  },
  taskContent: {
    flexDirection: 'column',
  },
  taskText: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  noTasksText: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  addTaskButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'center',
  },
  addTaskButtonBottom: {
    marginTop: 10,
  },
  addTaskButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
  hintContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  hint: {
    fontSize: 16,
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  hintSub: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
  },
  legend: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    width: '80%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#2c3e50',
  },
});

export default CalendarScreen;