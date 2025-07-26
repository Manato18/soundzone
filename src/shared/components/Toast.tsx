import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onHide?: () => void;
}

interface ToastConfig {
  message: string;
  type: ToastType;
  duration: number;
}

// トーストの表示を管理するシングルトン
class ToastManager {
  private static instance: ToastManager;
  private showToast: ((config: ToastConfig) => void) | null = null;

  static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  setShowToast(showToast: (config: ToastConfig) => void) {
    this.showToast = showToast;
  }

  show(message: string, type: ToastType = 'info', duration: number = 3000) {
    if (this.showToast) {
      this.showToast({ message, type, duration });
    }
  }
}

export const toast = ToastManager.getInstance();

// トーストプロバイダーコンポーネント
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toastConfig, setToastConfig] = useState<ToastConfig | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;
  const hideTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    toast.setShowToast((config) => {
      // 既存のトーストがある場合はキャンセル
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }

      setToastConfig(config);
    });
  }, []);

  useEffect(() => {
    if (toastConfig) {
      // 表示アニメーション
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }),
      ]).start();

      // 自動非表示
      hideTimeoutRef.current = setTimeout(() => {
        hideToast();
      }, toastConfig.duration || 3000);
    }
  }, [toastConfig]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastConfig(null);
      fadeAnim.setValue(0);
      translateY.setValue(-100);
    });

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
  };

  const getToastStyle = () => {
    if (!toastConfig) return {};

    const styles = {
      success: { backgroundColor: '#4CAF50' },
      error: { backgroundColor: '#F44336' },
      info: { backgroundColor: '#2196F3' },
    };

    return styles[toastConfig.type];
  };

  const getIcon = () => {
    if (!toastConfig) return null;

    const icons = {
      success: 'checkmark-circle',
      error: 'alert-circle',
      info: 'information-circle',
    };

    return icons[toastConfig.type];
  };

  return (
    <>
      {children}
      {toastConfig && (
        <Animated.View
          style={[
            styles.container,
            getToastStyle(),
            {
              opacity: fadeAnim,
              transform: [{ translateY }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.content}
            onPress={hideToast}
            activeOpacity={0.8}
          >
            <Ionicons
              name={getIcon() as any}
              size={24}
              color="white"
              style={styles.icon}
            />
            <Text style={styles.message} numberOfLines={2}>
              {toastConfig.message}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    right: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  icon: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    lineHeight: 20,
  },
});

// 便利な関数エクスポート
export const showToast = (message: string, type: ToastType = 'info', duration?: number) => {
  toast.show(message, type, duration);
};