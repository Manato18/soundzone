import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { QueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../shared/services/supabase';
import { queryKeys } from '../../../../shared/presenter/queries/queryClient';
import { useAuthStore } from '../../application/auth-store';
import { QueryUser } from '../../domain/entities/User';
import { authTokenManager } from './authTokenManager';
import { sessionPersistence } from './sessionPersistence';

/**
 * 認証状態の単一ソース管理
 * Supabaseの認証状態変更を監視し、ZustandストアとTanStack Queryを同期
 */
export class AuthStateManager {
  private static instance: AuthStateManager;
  private queryClient: QueryClient | null = null;
  private authSubscription: { data: { subscription: { unsubscribe: () => void } } } | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): AuthStateManager {
    if (!AuthStateManager.instance) {
      AuthStateManager.instance = new AuthStateManager();
    }
    return AuthStateManager.instance;
  }

  /**
   * 初期化（アプリ起動時に一度だけ呼び出す）
   * @param queryClient - QueryClientインスタンス
   * @param restoredSession - 復元されたセッション（オプション）
   */
  async initialize(queryClient: QueryClient, restoredSession?: Session | null): Promise<void> {
    if (this.isInitialized) {
      console.warn('[AuthStateManager] Already initialized');
      return;
    }

    this.queryClient = queryClient;
    
    // セッションが渡された場合はそれを使用、なければ現在のセッションを取得
    let session = restoredSession;
    if (session === undefined) {
      const { data } = await supabase.auth.getSession();
      session = data.session;
    }
    
    // 初期状態を設定
    await this.syncAuthState(session);

    // 認証状態変更の監視を開始
    this.authSubscription = supabase.auth.onAuthStateChange(
      this.handleAuthStateChange.bind(this)
    );

    // トークン自動更新マネージャーを初期化
    await authTokenManager.initialize();

    this.isInitialized = true;
    console.log('[AuthStateManager] Initialized with session:', !!session);
  }

  /**
   * クリーンアップ（アプリ終了時に呼び出す）
   */
  cleanup(): void {
    if (this.authSubscription) {
      this.authSubscription.data.subscription.unsubscribe();
      this.authSubscription = null;
    }
    authTokenManager.cleanup();
    this.isInitialized = false;
    console.log('[AuthStateManager] Cleaned up');
  }

  /**
   * 認証状態変更ハンドラー
   */
  private async handleAuthStateChange(event: AuthChangeEvent, session: Session | null): Promise<void> {
    console.log('[AuthStateManager] Auth state changed:', event);

    // authTokenManagerに通知
    authTokenManager.handleAuthStateChange(event, session);

    switch (event) {
      case 'SIGNED_IN':
      case 'TOKEN_REFRESHED':
      case 'USER_UPDATED':
        await this.syncAuthState(session);
        break;
      
      case 'SIGNED_OUT':
        await this.clearAuthState();
        break;
      
      case 'INITIAL_SESSION':
        // 初期セッションは initialize で処理済み
        // 注意: ここでclearAuthStateを呼ばない（セッション復元を妨げるため）
        break;
      
      default:
        console.log('[AuthStateManager] Unhandled auth event:', event);
    }
  }

  /**
   * 認証状態を同期
   */
  private async syncAuthState(session: Session | null): Promise<void> {
    const store = useAuthStore.getState();
    
    if (session?.user) {
      // ユーザー情報を QueryUser 形式に変換
      const queryUser: QueryUser = {
        id: session.user.id,
        email: session.user.email || '',
        emailVerified: session.user.email_confirmed_at ? true : false,
        name: session.user.user_metadata?.name || undefined,
        avatarUrl: session.user.user_metadata?.avatar_url || undefined,
      };

      // Zustand ストアを更新
      store.setUser(queryUser);

      // TanStack Query キャッシュを更新
      if (this.queryClient) {
        this.queryClient.setQueryData(queryKeys.auth.user(), queryUser);
        
        // 認証関連以外のクエリを無効化（ユーザー固有のデータを再取得）
        await this.queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] !== 'auth'
        });
      }

      // セッションを永続化
      await sessionPersistence.persistSession(session);
    } else {
      // セッションがない場合でも、明示的なサインアウト以外ではクリアしない
      // （セッション復元中や初期化中の可能性があるため）
      console.log('[AuthStateManager] No session in syncAuthState - skipping clear');
    }
  }

  /**
   * 認証状態をクリア
   */
  private async clearAuthState(): Promise<void> {
    const store = useAuthStore.getState();
    
    // Zustand ストアをリセット
    store.reset();

    // TanStack Query キャッシュをクリア
    if (this.queryClient) {
      this.queryClient.setQueryData(queryKeys.auth.user(), null);
      this.queryClient.removeQueries({ queryKey: queryKeys.auth.all });
      
      // 全てのクエリを無効化
      await this.queryClient.invalidateQueries();
    }

    // 永続化されたセッションをクリア
    await sessionPersistence.clearPersistedSession();
  }

  /**
   * 手動でユーザー情報を再取得
   */
  async refreshUserData(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: { session } } = await supabase.auth.getSession();
      await this.syncAuthState(session);
    }
  }

  /**
   * 現在の認証状態を取得
   */
  async getAuthState(): Promise<{
    isAuthenticated: boolean;
    user: User | null;
    session: Session | null;
  }> {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: { user } } = await supabase.auth.getUser();
    
    return {
      isAuthenticated: !!session && !!user,
      user,
      session,
    };
  }
}

// シングルトンインスタンスをエクスポート
export const authStateManager = AuthStateManager.getInstance();