import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { taskService } from '../database/taskService';
import { useAuth } from '../contexts/AuthContext';

interface CalendarComponentProps {
  onDateSelect: (date: string) => void;
  selectedDate: string;
}

// Определяем типы для markedDates
interface Dot {
  key: string;
  color: string;
}

interface MarkedDate {
  selected?: boolean;
  selectedColor?: string;
  dots?: Dot[];
}

type MarkedDates = {
  [date: string]: MarkedDate;
};

const CalendarComponent: React.FC<CalendarComponentProps> = ({ 
  onDateSelect, 
  selectedDate 
}) => {
  const { user } = useAuth();
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [currentMonth, setCurrentMonth] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Загрузка задач для месяца
  const loadTasksForMonth = async (monthYear: string) => {
    if (!user) {
      console.log('Пользователь не авторизован');
      return;
    }

    setIsLoading(true);
    
    try {
      const [year, month] = monthYear.split('-').map(Number);
      console.log(`Загрузка задач для ${year}-${month}, пользователь ID: ${user.id}`);
      
      const tasks = await taskService.getTasksByMonth(user.id, year, month);
      console.log(`Загружено ${tasks.length} задач для месяца`);
      
      const marked: MarkedDates = {};
      
      tasks.forEach((task, index) => {
        if (task.date) {
          if (!marked[task.date]) {
            marked[task.date] = {
              dots: []
            };
          }
          
          if (!task.completed) {
            const dotColor = task.priority === 'high' ? '#e74c3c' : '#3498db';
            if (marked[task.date].dots) {
              marked[task.date].dots!.push({ 
                key: `task-${task.id || index}`, 
                color: dotColor 
              });
              
              if (marked[task.date].dots!.length > 3) {
                marked[task.date].dots = marked[task.date].dots!.slice(0, 3);
              }
            }
          }
        }
      });
      
      if (selectedDate) {
        if (marked[selectedDate]) {
          marked[selectedDate] = {
            ...marked[selectedDate],
            selected: true,
            selectedColor: '#3498db'
          };
        } else {
          marked[selectedDate] = {
            selected: true,
            selectedColor: '#3498db'
          };
        }
      }
      
      const daysWithTasks = Object.keys(marked).length;
      console.log(`Найдено дней с задачами: ${daysWithTasks}`);
      
      setMarkedDates(marked);
      
    } catch (error) {
      console.error('Ошибка загрузки задач для месяца:', error);
      setMarkedDates({});
    } finally {
      setIsLoading(false);
    }
  };

  const handleMonthChange = (month: any) => {
    const monthYear = `${month.year}-${month.month}`;
    setCurrentMonth(monthYear);
    loadTasksForMonth(monthYear);
  };

  useEffect(() => {
    if (user) {
      const now = new Date();
      const monthYear = `${now.getFullYear()}-${now.getMonth() + 1}`;
      setCurrentMonth(monthYear);
      loadTasksForMonth(monthYear);
    }
  }, [user]);

  useEffect(() => {
    if (selectedDate && !isLoading) {
      const updatedMarkedDates = { ...markedDates };
      
      Object.keys(updatedMarkedDates).forEach(date => {
        const markedDate = updatedMarkedDates[date];
        if (markedDate.selected) {
          delete markedDate.selected;
          delete markedDate.selectedColor;
          
          if (markedDate.dots && markedDate.dots.length > 0) {
            updatedMarkedDates[date] = { dots: markedDate.dots };
          } else {
            delete updatedMarkedDates[date];
          }
        }
      });
      
      if (updatedMarkedDates[selectedDate]) {
        updatedMarkedDates[selectedDate] = {
          ...updatedMarkedDates[selectedDate],
          selected: true,
          selectedColor: '#3498db'
        };
      } else {
        updatedMarkedDates[selectedDate] = {
          selected: true,
          selectedColor: '#3498db'
        };
      }
      
      setMarkedDates(updatedMarkedDates);
    }
  }, [selectedDate]);

  const theme = {
    backgroundColor: '#ffffff',
    calendarBackground: '#ffffff',
    textSectionTitleColor: '#b6c1cd',
    selectedDayBackgroundColor: '#3498db',
    selectedDayTextColor: '#ffffff',
    todayTextColor: '#3498db',
    dayTextColor: '#2d4150',
    arrowColor: '#3498db',
    monthTextColor: '#2c3e50',
    textMonthFontWeight: 'bold' as const,
    textMonthFontSize: 18,
    // Убрал кастомные стили для точек чтобы не ломать отображение
  };

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={(day) => {
          onDateSelect(day.dateString);
        }}
        onMonthChange={handleMonthChange}
        markedDates={markedDates}
        markingType={'multi-dot'}
        theme={theme}
        style={styles.calendar}
        hideExtraDays={false}
        showWeekNumbers={false}
        firstDay={1}
        enableSwipeMonths={true}
      />
      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 10,
    position: 'relative',
  },
  calendar: {
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  loadingText: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
  },
});

export default CalendarComponent;