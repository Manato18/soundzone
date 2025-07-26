import { QueryClient, QueryClientConfig } from '@tanstack/react-query';

// TanStack Query設定
const queryConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      // デフォルトのキャッシュ時間（5分）
      staleTime: 5 * 60 * 1000,
      // ガベージコレクション時間（10分）
      gcTime: 10 * 60 * 1000,
      // エラー時のリトライ設定
      retry: (failureCount, error: any) => {
        // ネットワークエラーの場合は3回まで
        if (error?.name === 'NetworkError') {
          return failureCount < 3;
        }
        // 認証エラーの場合はリトライしない
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // その他のエラーは1回まで
        return failureCount < 1;
      },
      // バックグラウンドでの再フェッチを無効
      refetchOnWindowFocus: false,
      // ネットワーク再接続時に再フェッチ
      refetchOnReconnect: true,
      // マウント時に再フェッチしない
      refetchOnMount: false,
    },
    mutations: {
      // ミューテーションのリトライ設定
      retry: (failureCount, error: any) => {
        // 認証エラーの場合はリトライしない
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // ネットワークエラーの場合は2回まで
        if (error?.name === 'NetworkError') {
          return failureCount < 2;
        }
        // その他のエラーはリトライしない
        return false;
      },
    },
  },
};

// QueryClientインスタンス
export const queryClient = new QueryClient(queryConfig);

// クエリキーのファクトリー関数
export const queryKeys = {
  // 認証関連
  auth: {
    all: ['auth'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
  },
  // 他の機能のキーを追加可能
  audioPin: {
    all: ['audioPin'] as const,
    list: (filters?: Record<string, any>) => 
      [...queryKeys.audioPin.all, 'list', filters] as const,
    detail: (id: string) => 
      [...queryKeys.audioPin.all, 'detail', id] as const,
  },
  layer: {
    all: ['layer'] as const,
    list: () => [...queryKeys.layer.all, 'list'] as const,
    detail: (id: string) => 
      [...queryKeys.layer.all, 'detail', id] as const,
  },
  // アカウント関連
  account: {
    all: ['account'] as const,
    profile: (userId: string) => 
      [...queryKeys.account.all, 'profile', userId] as const,
    checkExists: (userId: string) => 
      [...queryKeys.account.all, 'exists', userId] as const,
  },
} as const;

// エラーハンドリング用のユーティリティ
export const handleQueryError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }
  return '予期しないエラーが発生しました';
};

// クエリクライアントのリセット（ログアウト時などに使用）
export const resetQueryClient = () => {
  queryClient.clear();
  queryClient.removeQueries();
  queryClient.resetQueries();
};

// 認証関連クエリのみを無効化
export const invalidateAuthQueries = () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
};

// 特定のクエリを削除
export const removeQuery = (queryKey: readonly unknown[]) => {
  queryClient.removeQueries({ queryKey });
};