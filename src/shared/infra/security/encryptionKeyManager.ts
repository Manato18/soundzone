import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const ENCRYPTION_KEY_STORAGE_KEY = 'soundzone_mmkv_encryption_key';
const KEY_LENGTH = 32; // 256 bits

export class EncryptionKeyManager {
  private static instance: EncryptionKeyManager;
  private encryptionKey: string | null = null;

  private constructor() {}

  static getInstance(): EncryptionKeyManager {
    if (!EncryptionKeyManager.instance) {
      EncryptionKeyManager.instance = new EncryptionKeyManager();
    }
    return EncryptionKeyManager.instance;
  }

  async getOrCreateEncryptionKey(): Promise<string> {
    // メモリキャッシュから返す
    if (this.encryptionKey) {
      return this.encryptionKey;
    }

    try {
      // Secure Storeから既存のキーを取得
      const existingKey = await SecureStore.getItemAsync(ENCRYPTION_KEY_STORAGE_KEY);
      
      if (existingKey) {
        this.encryptionKey = existingKey;
        return existingKey;
      }

      // 新しいキーを生成
      const randomBytes = await Crypto.getRandomBytesAsync(KEY_LENGTH);
      const newKey = btoa(String.fromCharCode(...new Uint8Array(randomBytes)));
      
      // Secure Storeに保存
      await SecureStore.setItemAsync(ENCRYPTION_KEY_STORAGE_KEY, newKey, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      
      this.encryptionKey = newKey;
      return newKey;
    } catch (error) {
      console.error('Failed to get or create encryption key:', error);
      
      // フォールバック: デバイス固有の疑似ランダムキーを生成
      // 本番環境では適切なエラーハンドリングが必要
      const fallbackKey = await this.generateFallbackKey();
      this.encryptionKey = fallbackKey;
      return fallbackKey;
    }
  }

  private async generateFallbackKey(): Promise<string> {
    // デバイス固有の情報を使用して疑似ランダムキーを生成
    // 注意: これは一時的な解決策であり、セキュアストレージが利用できない場合のみ使用
    const timestamp = Date.now().toString();
    const randomComponent = Math.random().toString(36);
    const combinedString = `soundzone-fallback-${timestamp}-${randomComponent}`;
    
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      combinedString,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    
    return digest.substring(0, 44); // 適切な長さに調整
  }

  async rotateEncryptionKey(): Promise<string> {
    // 新しいキーを生成
    const randomBytes = await Crypto.getRandomBytesAsync(KEY_LENGTH);
    const newKey = btoa(String.fromCharCode(...new Uint8Array(randomBytes)));
    
    // Secure Storeに保存
    await SecureStore.setItemAsync(ENCRYPTION_KEY_STORAGE_KEY, newKey, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    
    // メモリキャッシュをクリア
    this.encryptionKey = newKey;
    
    return newKey;
  }

  clearCache(): void {
    this.encryptionKey = null;
  }

  async deleteEncryptionKey(): Promise<void> {
    await SecureStore.deleteItemAsync(ENCRYPTION_KEY_STORAGE_KEY);
    this.encryptionKey = null;
  }
}

export const encryptionKeyManager = EncryptionKeyManager.getInstance();