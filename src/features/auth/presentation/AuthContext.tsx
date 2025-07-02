import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, AuthSession } from '../../../shared/services/supabase';

// AuthContextの型定義
interface AuthContextType {
  session: AuthSession;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: Error }>;
  signUp: (email: string, password: string) => Promise<{ error?: Error }>;
  signOut: () => Promise<void>;
}

// Contextを作成
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProviderコンポーネント
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 初期化時に保存されたセッションを復元
    loadStoredSession();

    // Supabaseの認証状態変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        setSession(session);
        
        // セッションをAsyncStorageに保存
        if (session) {
          await AsyncStorage.setItem('supabase_session', JSON.stringify(session));
        } else {
          await AsyncStorage.removeItem('supabase_session');
        }
        
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // 保存されたセッションを読み込み
  const loadStoredSession = async () => {
    try {
      const storedSession = await AsyncStorage.getItem('supabase_session');
      if (storedSession) {
        const parsedSession = JSON.parse(storedSession);
        setSession(parsedSession);
      }
    } catch (error) {
      console.error('セッション復元エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // サインイン
  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setIsLoading(false);
    return { error: error || undefined };
  };

  // サインアップ
  const signUp = async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    setIsLoading(false);
    return { error: error || undefined };
  };

  // サインアウト
  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    await AsyncStorage.removeItem('supabase_session');
    setIsLoading(false);
  };

  const value: AuthContextType = {
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// useAuth hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 