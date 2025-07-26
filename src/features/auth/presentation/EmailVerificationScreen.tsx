import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useEmailVerificationHook } from './hooks/use-auth';

interface EmailVerificationScreenProps {
  route: {
    params: {
      email: string;
    };
  };
  navigation: {
    goBack: () => void;
  };
}

export default function EmailVerificationScreen({ 
  route, 
  navigation 
}: EmailVerificationScreenProps) {
  const { email } = route.params;
  
  // 統合フックを使用
  const {
    verification,
    verifyOTP,
    resendEmail,
    updateCode,
    clearErrors,
    isVerifying,
    isResending,
    setEmailAndStartCooldown,
  } = useEmailVerificationHook();
  
  // 6桁のOTPコード管理（各桁を配列で管理）
  const [otpCode, setOtpCode] = useState<string[]>(['', '', '', '', '', '']);
  
  // TextInput参照配列（フォーカス制御用）
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // 初回マウント時にメールアドレスとクールダウンを設定
  React.useEffect(() => {
    if (email && (!verification.email || verification.email !== email)) {
      setEmailAndStartCooldown(email);
    }
  }, [email, verification.email, setEmailAndStartCooldown]);

  // OTPコード入力処理
  const handleOtpCodeChange = useCallback((value: string, index: number) => {
    // 数字のみ許可
    const numericValue = value.replace(/[^0-9]/g, '');
    
    if (numericValue.length <= 1) {
      const newOtpCode = [...otpCode];
      newOtpCode[index] = numericValue;
      setOtpCode(newOtpCode);
      
      // 統合フックに反映
      updateCode(newOtpCode.join(''));
      
      // 次の入力フィールドにフォーカス移動
      if (numericValue && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
      
      // 6桁すべて入力されたら自動検証
      const completeCode = newOtpCode.join('');
      if (completeCode.length === 6) {
        Keyboard.dismiss();
        handleVerifyOtp(completeCode);
      }
    }
  }, [otpCode, updateCode]);

  // バックスペース処理
  const handleOtpKeyPress = useCallback((key: string, index: number) => {
    if (key === 'Backspace' && !otpCode[index] && index > 0) {
      // 現在の入力が空でバックスペースの場合、前の入力フィールドにフォーカス
      inputRefs.current[index - 1]?.focus();
    }
  }, [otpCode]);

    // OTP検証処理
  const handleVerifyOtp = useCallback(async (code: string) => {
    const result = await verifyOTP(code);
    
    if (result.success) {
      // OTP認証成功後、アラートを表示
      Alert.alert('認証完了', 'メール認証が完了しました！', [
        { text: 'OK', onPress: () => {
          // OTP認証完了後、RootNavigatorに認証状態の再評価を任せる
          // 認証状態が更新されれば、RootNavigatorが自動的にAppNavigatorに切り替える
          // EmailVerificationScreenからの明示的な遷移は不要
          console.log('OTP verification completed - authentication state will be re-evaluated');
        }}
      ]);
    }
  }, [verifyOTP]);

  // メール再送信処理
  const handleResendEmail = useCallback(async () => {
    if (verification.resendCooldown > 0) return;
    
    const result = await resendEmail();
    
    if (result.success) {
      Alert.alert(
        'メール再送信完了', 
        'メール認証コードを再送信しました。メールをご確認ください。',
        [{ text: 'OK' }]
      );
    }
  }, [resendEmail, verification.resendCooldown]);

  // フォームリセット
  const handleReset = useCallback(() => {
    setOtpCode(['', '', '', '', '', '']);
    updateCode('');
    clearErrors();
    inputRefs.current[0]?.focus();
  }, [updateCode, clearErrors]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>メール認証</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail" size={60} color="#007AFF" />
        </View>

        <Text style={styles.title}>認証コードを入力</Text>
        <Text style={styles.subtitle}>
          以下のメールアドレスに6桁の認証コードを送信しました
        </Text>
        <Text style={styles.emailText}>{email}</Text>

        {/* OTPコード入力エリア */}
        <View style={styles.otpContainer}>
          {otpCode.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[
                styles.otpInput,
                digit ? styles.otpInputFilled : null,
                verification.errors.code ? styles.otpInputError : null,
              ]}
              value={digit}
              onChangeText={(value) => handleOtpCodeChange(value, index)}
              onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={Platform.OS === 'android' ? 1 : 2}
              selectTextOnFocus
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              editable={!isVerifying}
            />
          ))}
        </View>

        {(verification.errors.code || verification.errors.general) && (
          <Text style={styles.errorText}>
            {verification.errors.code || verification.errors.general}
          </Text>
        )}

        {/* 手動検証ボタン（6桁入力済みだが検証に失敗した場合） */}
        {otpCode.join('').length === 6 && !isVerifying && (
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={() => handleVerifyOtp(otpCode.join(''))}
          >
            <Text style={styles.verifyButtonText}>認証コードを確認</Text>
          </TouchableOpacity>
        )}

        {/* 検証中インジケーター */}
        {isVerifying && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>認証中...</Text>
          </View>
        )}

        {/* メール再送信セクション */}
        <View style={styles.resendSection}>
          <Text style={styles.resendText}>
            認証コードが届かない場合
          </Text>
          
          <TouchableOpacity
            style={[
              styles.resendButton,
              (verification.resendCooldown > 0 || isResending) && styles.resendButtonDisabled
            ]}
            onPress={handleResendEmail}
            disabled={verification.resendCooldown > 0 || isResending}
          >
            {isResending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.resendButtonText}>
                {verification.resendCooldown > 0 
                  ? `再送信可能まで ${verification.resendCooldown}秒` 
                  : 'メール再送信'
                }
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* リセットとヘルプ */}
        <View style={styles.helpSection}>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>入力内容をクリア</Text>
          </TouchableOpacity>
          
          <Text style={styles.helpText}>
            迷惑メールフォルダもご確認ください。{'\n'}
            コードの有効期限は5分間です。
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 8,
    lineHeight: 22,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#007AFF',
    marginBottom: 32,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    backgroundColor: 'white',
    color: '#1a1a1a',
  },
  otpInputFilled: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  otpInputError: {
    borderColor: '#ff4444',
    backgroundColor: '#fff0f0',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  verifyButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  resendSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  resendText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  resendButton: {
    backgroundColor: '#34c759',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 120,
    alignItems: 'center',
  },
  resendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  resendButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  helpSection: {
    alignItems: 'center',
  },
  resetButton: {
    padding: 8,
    marginBottom: 16,
  },
  resetButtonText: {
    color: '#007AFF',
    fontSize: 14,
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
}); 