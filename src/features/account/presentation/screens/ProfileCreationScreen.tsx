import React, { useEffect, useLayoutEffect, memo } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useProfileCreationForm } from '../hooks/use-account';
import { showToast } from '../../../../shared/components/Toast';
import { uriToBlob } from '../../../../shared/utils/imageCompressor';

function ProfileCreationScreen() {
  const navigation = useNavigation();
  const {
    form,
    uploadState,
    validateDisplayName,
    validateBio,
    updateForm,
    selectImage,
    checkImageSize,
    createProfile,
    cleanup,
    isCreating,
    isUploading,
  } = useProfileCreationForm();

  // ヘッダーを非表示
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // クリーンアップはプロフィール作成成功時のみ実行
  // アンマウント時には実行しない（再マウントで状態が消えるため）

  // 権限リクエスト
  const requestPermission = async (permissionType: 'camera' | 'mediaLibrary') => {
    if (permissionType === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'カメラへのアクセス',
          'プロフィール画像を撮影するにはカメラへのアクセスを許可してください',
          [{ text: 'OK' }]
        );
        return false;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          '写真へのアクセス',
          'プロフィール画像を選択するには写真へのアクセスを許可してください',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  // カメラから撮影
  const handleTakePhoto = async () => {
    const hasPermission = await requestPermission('camera');
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      await handleImageSelected(result.assets[0]);
    }
  };

  // ギャラリーから選択
  const handleSelectFromGallery = async () => {
    const hasPermission = await requestPermission('mediaLibrary');
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      await handleImageSelected(result.assets[0]);
    }
  };

  // 画像選択後の処理（改善版）
  const handleImageSelected = async (asset: ImagePicker.ImagePickerAsset) => {
    try {
      // Blobに変換
      const blob = await uriToBlob(asset.uri);
      
      // ファイルサイズチェック
      if (!checkImageSize(blob.size)) {
        return;
      }
      
      // ファイル名を生成（拡張子を維持）
      const extension = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `avatar_${Date.now()}.${extension}`;
      
      // Blobにnameプロパティとtypeプロパティを追加
      Object.defineProperty(blob, 'name', {
        value: fileName,
        writable: false,
        enumerable: true,
        configurable: true
      });
      
      if (!blob.type) {
        Object.defineProperty(blob, 'type', {
          value: asset.type || `image/${extension}`,
          writable: false,
          enumerable: true,
          configurable: true
        });
      }
      
      // 画像を選択（Blobは別管理）
      selectImage(asset.uri, blob);
      showToast('画像を選択しました', 'success');
    } catch (error) {
      console.error('Image selection error:', error);
      showToast('画像の選択に失敗しました', 'error');
    }
  };

  // プロフィール作成
  const handleCreateProfile = async () => {
    const result = await createProfile();
    
    if (result.success) {
      showToast('プロフィールを作成しました', 'success');
      cleanup(); // 成功時のみクリーンアップ
      // 自動的にホーム画面へ遷移（RootNavigatorが判定）
    } else {
      showToast(result.error || 'プロフィールの作成に失敗しました', 'error');
    }
  };

  // アバター画像の表示URL
  const avatarDisplayUrl = form.avatarUri || uploadState.uploadedUrl;

  // フォームが有効かどうか
  const isFormValid = 
    form.displayName.trim().length > 0 && 
    !form.errors.displayName &&
    !form.errors.bio &&
    !form.isSubmitting &&
    !isCreating &&
    !isUploading;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={styles.title}>プロフィールを作成</Text>
            <Text style={styles.subtitle}>
              あなたのプロフィール情報を入力してください
            </Text>
          </View>

          {/* アバター画像選択 */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={handleSelectFromGallery}
              disabled={isUploading}
            >
              {avatarDisplayUrl ? (
                <Image source={{ uri: avatarDisplayUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={60} color="#999" />
                </View>
              )}
              
              {isUploading ? (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color="white" />
                  <Text style={styles.uploadingText}>
                    {Math.round(uploadState.uploadProgress)}%
                  </Text>
                </View>
              ) : (
                <View style={styles.avatarBadge}>
                  <Ionicons name="camera" size={20} color="white" />
                </View>
              )}
            </TouchableOpacity>

            {!avatarDisplayUrl && (
              <View style={styles.imageButtonsContainer}>
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={handleTakePhoto}
                  disabled={isUploading}
                >
                  <Ionicons name="camera-outline" size={24} color="#007AFF" />
                  <Text style={styles.imageButtonText}>写真を撮る</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={handleSelectFromGallery}
                  disabled={isUploading}
                >
                  <Ionicons name="images-outline" size={24} color="#007AFF" />
                  <Text style={styles.imageButtonText}>ギャラリー</Text>
                </TouchableOpacity>
              </View>
            )}

            {form.errors.avatar && (
              <Text style={styles.errorText}>{form.errors.avatar}</Text>
            )}
          </View>

          {/* 表示名入力 */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>表示名 *</Text>
            <TextInput
              style={[
                styles.input,
                form.errors.displayName ? styles.inputError : null,
              ]}
              placeholder="表示名を入力"
              value={form.displayName}
              onChangeText={(text) => {
                updateForm({ displayName: text });
                validateDisplayName(text);
              }}
              maxLength={32}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.charCount}>
              {form.displayName.length}/32
            </Text>
            {form.errors.displayName && (
              <Text style={styles.errorText}>{form.errors.displayName}</Text>
            )}
          </View>

          {/* 自己紹介入力 */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>自己紹介</Text>
            <TextInput
              style={[
                styles.textArea,
                form.errors.bio ? styles.inputError : null,
              ]}
              placeholder="自己紹介を入力（任意）"
              value={form.bio}
              onChangeText={(text) => {
                updateForm({ bio: text });
                validateBio(text);
              }}
              maxLength={300}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              {form.bio.length}/300
            </Text>
            {form.errors.bio && (
              <Text style={styles.errorText}>{form.errors.bio}</Text>
            )}
          </View>

          {/* エラーメッセージ */}
          {form.errors.general && (
            <View style={styles.generalError}>
              <Ionicons name="alert-circle" size={20} color="#FF3B30" />
              <Text style={styles.generalErrorText}>{form.errors.general}</Text>
            </View>
          )}

          {/* 作成ボタン */}
          <TouchableOpacity
            style={[
              styles.createButton,
              !isFormValid && styles.createButtonDisabled,
            ]}
            onPress={handleCreateProfile}
            disabled={!isFormValid}
          >
            {isCreating || isUploading ? (
              <View style={styles.creatingContainer}>
                <ActivityIndicator color="white" />
                <Text style={styles.creatingText}>
                  {isUploading ? '画像をアップロード中...' : '作成中...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.createButtonText}>プロフィールを作成</Text>
            )}
          </TouchableOpacity>

          {/* 注意事項 */}
          <Text style={styles.note}>
            * は必須項目です
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e1e5e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#f8f9fa',
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
  },
  imageButtonText: {
    color: '#007AFF',
    fontSize: 14,
    marginLeft: 8,
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  textArea: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  generalError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  generalErrorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  creatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  creatingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
});

export default memo(ProfileCreationScreen);