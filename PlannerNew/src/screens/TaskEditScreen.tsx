import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { taskService } from '../database/taskService';
import { useAuth } from '../contexts/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';

interface TaskEditScreenProps {
  onGoBack: () => void;
  onTaskSaved?: () => void;
  taskId?: number;
  initialDate?: string;
}

const TaskEditScreen: React.FC<TaskEditScreenProps> = ({ 
  onGoBack, 
  onTaskSaved,
  taskId,
  initialDate
}) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'high' | 'low'>('low');
  const [date, setDate] = useState<Date | null>(null);
  const [timeType, setTimeType] = useState<'none' | 'single' | 'range'>('none');
  const [singleTime, setSingleTime] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<'single' | 'start' | 'end' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!taskId;

  useEffect(() => {
    if (taskId) {
      loadTask();
    } else if (initialDate) {
      setDate(new Date(initialDate));
    }
  }, [taskId, initialDate]);

  const loadTask = async () => {
    if (!taskId) return;
    
    try {
      const task = await taskService.getTaskById(taskId);
      if (task) {
        setContent(task.content);
        setPriority(task.priority);
        
        if (task.date) {
          setDate(new Date(task.date));
        }
        
        // Определяем тип времени из данных задачи
        if (task.start_time && task.end_time) {
          setTimeType('range');
          const [startHours, startMinutes] = task.start_time.split(':').map(Number);
          const [endHours, endMinutes] = task.end_time.split(':').map(Number);
          
          const startTimeDate = new Date();
          startTimeDate.setHours(startHours, startMinutes, 0, 0);
          setStartTime(startTimeDate);
          
          const endTimeDate = new Date();
          endTimeDate.setHours(endHours, endMinutes, 0, 0);
          setEndTime(endTimeDate);
        } else if (task.start_time) {
          setTimeType('single');
          const [hours, minutes] = task.start_time.split(':').map(Number);
          const singleTimeDate = new Date();
          singleTimeDate.setHours(hours, minutes, 0, 0);
          setSingleTime(singleTimeDate);
        }
      }
    } catch (error) {
      console.error('Error loading task:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить задачу');
    }
  };

  const handleSave = async () => {
  if (!content.trim()) {
    Alert.alert('Внимание', 'Введите текст задачи');
    return;
  }

  if (!user) {
    Alert.alert('Ошибка', 'Пользователь не авторизован');
    return;
  }

  // ДОБАВЬТЕ ПРОВЕРКУ НА ДАТУ
  if (!date) {
    Alert.alert('Внимание', 'Выберите дату выполнения задачи');
    return;
  }

  setIsLoading(true);

  try {
    // Формируем данные для сохранения
    const taskData: any = {
      user_id: user.id,
      content: content.trim(),
      priority,
      date: date.toISOString().split('T')[0], // ОБЯЗАТЕЛЬНАЯ ДАТА
      completed: false,
      sync_status: 'synced' as const,
      local_id: `local_${Date.now()}`
    };

    // Обрабатываем время в зависимости от типа
    if (timeType === 'single' && singleTime) {
      taskData.start_time = singleTime.toTimeString().slice(0, 5); // "HH:MM"
      taskData.end_time = null;
    } else if (timeType === 'range' && startTime && endTime) {
      taskData.start_time = startTime.toTimeString().slice(0, 5);
      taskData.end_time = endTime.toTimeString().slice(0, 5);
      
      // Проверяем что конечное время после начального
      if (startTime >= endTime) {
        Alert.alert('Ошибка', 'Время окончания должно быть позже времени начала');
        setIsLoading(false);
        return;
      }
    } else {
      taskData.start_time = null;
      taskData.end_time = null;
    }

    if (isEditing && taskId) {
      await taskService.updateTask(taskId, taskData);
    } else {
      await taskService.createTask(taskData);
    }

    onTaskSaved?.();
    onGoBack();
  } catch (error) {
    console.error('Error saving task:', error);
    Alert.alert('Ошибка', 'Не удалось сохранить задачу');
  } finally {
    setIsLoading(false);
  }
};

  const handleDelete = () => {
    if (!taskId) return;

    Alert.alert(
      'Удалить задачу',
      'Вы уверены, что хотите удалить эту задачу?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await taskService.deleteTask(taskId);
              onTaskSaved?.();
              onGoBack();
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('Ошибка', 'Не удалось удалить задачу');
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Не выбрано';
    return date.toLocaleDateString('ru-RU');
  };

  const formatTime = (time: Date | null) => {
    if (!time) return 'Не выбрано';
    return time.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack}>
          <Text style={styles.headerButton}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Редактировать задачу' : 'Новая задача'}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={isLoading}>
          <Text style={[styles.headerButton, isLoading && styles.disabledButton]}>
            {isLoading ? '...' : '✓'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Текст задачи */}
        <TextInput
          style={styles.contentInput}
          placeholder="Введите текст задачи..."
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />

        {/* Приоритет */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Важность</Text>
          <View style={styles.priorityContainer}>
            <TouchableOpacity
              style={[
                styles.priorityButton,
                priority === 'high' && styles.priorityButtonActive
              ]}
              onPress={() => setPriority('high')}
            >
              <Text style={[
                styles.priorityButtonText,
                priority === 'high' && styles.priorityButtonTextActive
              ]}>
                Важное
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.priorityButton,
                priority === 'low' && styles.priorityButtonActive
              ]}
              onPress={() => setPriority('low')}
            >
              <Text style={[
                styles.priorityButtonText,
                priority === 'low' && styles.priorityButtonTextActive
              ]}>
                Неважное
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Дата выполнения */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Дата выполнения</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {formatDate(date)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Тип времени */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Время выполнения</Text>
          <View style={styles.timeTypeContainer}>
            <TouchableOpacity
              style={[
                styles.timeTypeButton,
                timeType === 'none' && styles.timeTypeButtonActive
              ]}
              onPress={() => setTimeType('none')}
            >
              <Text style={[
                styles.timeTypeButtonText,
                timeType === 'none' && styles.timeTypeButtonTextActive
              ]}>
                ❌ Без времени
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timeTypeButton,
                timeType === 'single' && styles.timeTypeButtonActive
              ]}
              onPress={() => setTimeType('single')}
            >
              <Text style={[
                styles.timeTypeButtonText,
                timeType === 'single' && styles.timeTypeButtonTextActive
              ]}>
                ⏰ Одно время
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timeTypeButton,
                timeType === 'range' && styles.timeTypeButtonActive
              ]}
              onPress={() => setTimeType('range')}
            >
              <Text style={[
                styles.timeTypeButtonText,
                timeType === 'range' && styles.timeTypeButtonTextActive
              ]}>
                🕒 Промежуток
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Выбор времени в зависимости от типа */}
        {timeType === 'single' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Время</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowTimePicker('single')}
            >
              <Text style={styles.dateButtonText}>
                {formatTime(singleTime)}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {timeType === 'range' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Промежуток времени</Text>
            <View style={styles.rangeContainer}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowTimePicker('start')}
              >
                <Text style={styles.dateButtonText}>
                  С: {formatTime(startTime)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowTimePicker('end')}
              >
                <Text style={styles.dateButtonText}>
                  По: {formatTime(endTime)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={date || new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setDate(selectedDate);
              }
            }}
          />
        )}

        {/* Time Picker */}
        {showTimePicker && (
          <DateTimePicker
            value={
              showTimePicker === 'single' ? singleTime || new Date() :
              showTimePicker === 'start' ? startTime || new Date() :
              endTime || new Date()
            }
            mode="time"
            display="default"
            onChange={(event, selectedTime) => {
              setShowTimePicker(null);
              if (selectedTime) {
                if (showTimePicker === 'single') {
                  setSingleTime(selectedTime);
                } else if (showTimePicker === 'start') {
                  setStartTime(selectedTime);
                } else {
                  setEndTime(selectedTime);
                }
              }
            }}
          />
        )}
      </ScrollView>

      {isEditing && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Удалить задачу</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerButton: {
    fontSize: 18,
    color: '#3498db',
    fontWeight: 'bold',
    paddingHorizontal: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 100,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#2c3e50',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  priorityButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
  },
  priorityButtonTextActive: {
    color: '#ffffff',
  },
  timeTypeContainer: {
    gap: 10,
  },
  timeTypeButton: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  timeTypeButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  timeTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
  },
  timeTypeButtonTextActive: {
    color: '#ffffff',
  },
  dateButton: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 8,
  },
  dateButtonText: {
    fontSize: 14,
    color: '#2c3e50',
    textAlign: 'center',
  },
  rangeContainer: {
    gap: 10,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  deleteButton: {
    padding: 12,
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TaskEditScreen;