import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export class NetworkService {
  private static instance: NetworkService;
  private isConnected: boolean = true;
  private connectionType: string = 'unknown';
  private listeners: Set<(isConnected: boolean) => void> = new Set();

  private constructor() {
    this.initializeNetworkListener();
  }

  static getInstance(): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService();
    }
    return NetworkService.instance;
  }

  /**
   * ネットワーク状態の監視を開始
   */
  private initializeNetworkListener() {
    NetInfo.addEventListener((state: NetInfoState) => {
      const wasConnected = this.isConnected;
      this.isConnected = state.isConnected ?? false;
      this.connectionType = state.type;

      console.log('[NetworkService] Network state changed:', {
        isConnected: this.isConnected,
        type: this.connectionType,
        details: state.details,
      });

      // 接続状態が変わった場合のみ通知
      if (wasConnected !== this.isConnected) {
        this.notifyListeners();
      }
    });

    // 初期状態を取得
    NetInfo.fetch().then((state) => {
      this.isConnected = state.isConnected ?? false;
      this.connectionType = state.type;
      console.log('[NetworkService] Initial network state:', {
        isConnected: this.isConnected,
        type: this.connectionType,
      });
    });
  }

  /**
   * 現在のネットワーク接続状態を取得
   */
  async isNetworkConnected(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  }

  /**
   * 現在の接続状態を同期的に取得（キャッシュされた値）
   */
  isConnectedSync(): boolean {
    return this.isConnected;
  }

  /**
   * ネットワーク状態変更のリスナーを追加
   */
  addConnectionListener(listener: (isConnected: boolean) => void): () => void {
    this.listeners.add(listener);
    
    // 現在の状態を即座に通知
    listener(this.isConnected);
    
    // アンサブスクライブ関数を返す
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * リスナーに通知
   */
  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.isConnected);
      } catch (error) {
        console.error('[NetworkService] Error in listener:', error);
      }
    });
  }

  /**
   * ネットワークエラーかどうかを判定
   */
  isNetworkError(error: unknown): boolean {
    const errorMessage = this.getErrorMessage(error).toLowerCase();
    
    return (
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('offline') ||
      errorMessage.includes('no internet') ||
      errorMessage.includes('network request failed') ||
      // React Native特有のエラー
      errorMessage.includes('typeerror: network request failed')
    );
  }

  /**
   * エラーからメッセージを抽出
   */
  private getErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }
    
    return '';
  }

  /**
   * ネットワーク接続を待つ
   * @param timeout タイムアウト時間（ミリ秒）
   */
  async waitForConnection(timeout: number = 30000): Promise<boolean> {
    if (this.isConnected) {
      return true;
    }

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, timeout);

      const unsubscribe = this.addConnectionListener((isConnected) => {
        if (isConnected) {
          clearTimeout(timer);
          unsubscribe();
          resolve(true);
        }
      });
    });
  }
}

export const networkService = NetworkService.getInstance();