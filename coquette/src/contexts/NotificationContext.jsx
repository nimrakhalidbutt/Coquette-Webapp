import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, rtdb } from '../firebase';
import { ref, onChildAdded, query, limitToLast, orderByChild, update, remove } from 'firebase/database';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);

  // Listen for notifications when user changes
  useEffect(() => {
    if (!auth.currentUser) {
      console.log('👤 No user logged in - clearing notifications');
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    console.log('👤 User logged in:', auth.currentUser.uid);
    console.log('🔔 Setting up notification listener...');

    const notificationsRef = ref(rtdb, `notifications/${auth.currentUser.uid}`);
    const recentNotifications = query(notificationsRef, orderByChild('timestamp'), limitToLast(50));
    
    const unsubscribe = onChildAdded(recentNotifications, (snapshot) => {
      const newNotification = {
        id: snapshot.key,
        ...snapshot.val()
      };
      
      console.log('🔔 New notification received:', newNotification);
      
      setNotifications(prev => {
        // Check if notification already exists
        if (prev.some(n => n.id === newNotification.id)) {
          console.log('⚠️ Notification already exists, skipping');
          return prev;
        }
        console.log('✅ Adding new notification to list');
        return [newNotification, ...prev].slice(0, 50);
      });
      
      // Update unread count and show toast for new notification
      if (!newNotification.read) {
        console.log('🔔 Unread notification - updating count and showing toast');
        setUnreadCount(prev => {
          const newCount = prev + 1;
          console.log('📊 Unread count:', newCount);
          return newCount;
        });
        showToast(newNotification);
      }
    }, (error) => {
      console.error('❌ Notification listener error:', error);
    });

    return () => {
      console.log('🔔 Cleaning up notification listener');
      unsubscribe();
    };
  }, [auth.currentUser]); // Re-run when user changes

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    if (!auth.currentUser) return;
    
    console.log('📖 Marking notification as read:', notificationId);
    
    try {
      const notificationRef = ref(rtdb, `notifications/${auth.currentUser.uid}/${notificationId}`);
      await update(notificationRef, { read: true });
      
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => {
        const newCount = Math.max(0, prev - 1);
        console.log('📊 New unread count:', newCount);
        return newCount;
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!auth.currentUser || notifications.length === 0) return;
    
    console.log('📖 Marking all notifications as read');
    
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      for (const notification of unreadNotifications) {
        const notificationRef = ref(rtdb, `notifications/${auth.currentUser.uid}/${notification.id}`);
        await update(notificationRef, { read: true });
      }
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      console.log('✅ All notifications marked as read');
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  // Clear all notifications
  const clearAll = async () => {
    if (!auth.currentUser) return;
    
    console.log('🗑️ Clearing all notifications');
    
    try {
      const notificationsRef = ref(rtdb, `notifications/${auth.currentUser.uid}`);
      await remove(notificationsRef);
      
      setNotifications([]);
      setUnreadCount(0);
      console.log('✅ All notifications cleared');
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  // Delete single notification
  const deleteNotification = async (notificationId) => {
    if (!auth.currentUser) return;
    
    console.log('🗑️ Deleting notification:', notificationId);
    
    try {
      const notificationRef = ref(rtdb, `notifications/${auth.currentUser.uid}/${notificationId}`);
      await remove(notificationRef);
      
      const wasUnread = notifications.find(n => n.id === notificationId)?.read === false;
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      console.log('✅ Notification deleted');
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const showToast = (notification) => {
    console.log('🍞 Showing toast for notification:', notification);
    const toastEvent = new CustomEvent('showNotificationToast', {
      detail: notification
    });
    window.dispatchEvent(toastEvent);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      showPanel,
      setShowPanel,
      markAsRead,
      markAllAsRead,
      clearAll,
      deleteNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};