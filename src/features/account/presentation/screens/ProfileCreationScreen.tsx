import React, { useEffect, useLayoutEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary, launchCamera, ImagePickerResponse, ImageLibraryOptions, CameraOptions } from 'react-native-image-picker';
import { useAuth } from '../../../auth/presentation/hooks/use-auth';
import { useProfileCreationFormHook } from '../hooks/use-account';
import { showToast } from '../../../../shared/components/Toast';
import { uriToBlob } from '../../../../shared/utils/imageCompressor';

export default function ProfileCreationScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const {
    form,
    avatarUpload,
    validateDisplayName,
    validateBio,
    updateForm,
    createProfile,
    selectAndUploadAvatar,
    cleanup,
    isCreating,
    isUploading,
  } = useProfileCreationFormHook();

  // ヘッダーを非表示
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // 画像選択オプション
  const imageOptions: ImageLibraryOptions & CameraOptions = {
    mediaType: 'photo',
    includeBase64: false,
    maxHeight: 1024,
    maxWidth: 1024,
    quality: 0.8,
  };

  // カメラから撮影
  const handleTakePhoto = () => {
    launchCamera(imageOptions, handleImageResponse);
  };

  // ギャラリーから選択
  const handleSelectFromGallery = () => {
    launchImageLibrary(imageOptions, handleImageResponse);
  };

  // 画像選択後の処理
  const handleImageResponse = async (response: ImagePickerResponse) => {
    if (response.didCancel || response.errorCode) {
      if (response.errorCode) {
        showToast('画像の選択に失敗しました', 'error');
      }
      return;
    }

    const asset = response.assets?.[0];
    if (!asset || !asset.uri) {
      showToast('画像の選択に失敗しました', 'error');
      return;
    }

    // ファイルサイズチェック（5MB）
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      showToast('画像サイズは5MB以下にしてください', 'error');
      return;
    }

    try {
      // Blobに変換してアップロード
      const blob = await uriToBlob(asset.uri);
      const file = new File([blob], asset.fileName || 'avatar.jpg', {
        type: asset.type || 'image/jpeg',
      });

      const result = await selectAndUploadAvatar(file);
      if (result.success) {
        showToast('画像をアップロードしました', 'success');
      } else {
        showToast(result.error || 'アップロードに失敗しました', 'error');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      showToast('画像のアップロードに失敗しました', 'error');
    }
  };

  // プロフィール作成
  const handleCreateProfile = async () => {
    const result = await createProfile();
    
    if (result.success) {
      showToast('プロフィールを作成しました', 'success');
      // 自動的にホーム画面へ遷移（RootNavigatorが判定）
    } else {
      showToast(result.error || 'プロフィールの作成に失敗しました', 'error');
    }
  };

  // アバター画像の表示URL
  const avatarDisplayUrl = avatarUpload.uploadedUrl || form.avatarPreviewUrl;

  // フォームが有効かどうか
  const isFormValid = 
    form.displayName.trim().length > 0 && 
    !form.errors.displayName &&
    !form.errors.bio &&
    avatarDisplayUrl &&
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
                    {Math.round(avatarUpload.uploadProgress)}%
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
            {isCreating ? (
              <ActivityIndicator color="white" />
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
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
});