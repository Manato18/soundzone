import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AuthStackParamList } from '../../../navigation/AuthNavigator';
import { useAuth, useSignUpFormHook } from './hooks/use-auth';

// 型定義
type SignUpScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'SignUp'>;
type SignUpScreenRouteProp = RouteProp<AuthStackParamList, 'SignUp'>;

interface SignUpScreenProps {
  navigation: SignUpScreenNavigationProp;
  route: SignUpScreenRouteProp;
}

export default function SignUpScreen({ navigation }: SignUpScreenProps) {
  const { form, updateEmail, updatePassword, updateConfirmPassword, handleSubmit, isSubmitting } = useSignUpFormHook();
  const { signOut } = useAuth();

  const handleBackToLogin = () => {
    navigation.goBack();
  };

  // 新規登録処理（実際のアカウント作成）
  const handleSignUp = async () => {
    // 新規登録開始前に既存セッションをクリア（安全なタイミング）
    try {
      await signOut();
      console.log('Cleared existing session before new sign up');
      
      // セッションクリア完了後にサインアップ処理を実行
      await new Promise(resolve => setTimeout(resolve, 300)); // 安定化のため少し待機
      
    } catch (error) {
      // エラーは無視（既にサインアウト済みの場合）
      console.log('No existing session to clear');
    }
    
    const result = await handleSubmit();
    
    if (result && result.success) {
      if (result.needsEmailVerification) {
        // メール認証が必要な場合、EmailVerificationScreenに遷移
        console.log('Navigating to EmailVerification screen for:', result.email);
        navigation.navigate('EmailVerification', { 
          email: result.email 
        });
      } else {
        // 既に認証済みの場合（自動ログイン）
        Alert.alert(
          'アカウント作成完了', 
          'アカウントが正常に作成されました！',
          [{ text: 'OK' }]
        );
      }
    }
  };

  // エラーがある場合はアラート表示（一度だけ表示するため、Refで制御）
  const shownErrorRef = React.useRef<string | null>(null);
  
  React.useEffect(() => {
    if (form.errors.general && form.errors.general !== shownErrorRef.current) {
      shownErrorRef.current = form.errors.general;
      Alert.alert('登録エラー', form.errors.general);
    }
    // エラーがクリアされた場合はRefもクリア
    if (!form.errors.general) {
      shownErrorRef.current = null;
    }
  }, [form.errors.general]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>新規登録</Text>
      <Text style={styles.subtitle}>SoundZoneに参加しよう</Text>

      <View style={styles.form}>
        <TextInput
          style={[styles.input, form.errors.email && styles.inputError]}
          placeholder="メールアドレス"
          value={form.email}
          onChangeText={updateEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isSubmitting}
        />
        {form.errors.email && (
          <Text style={styles.errorText}>{form.errors.email}</Text>
        )}

        <TextInput
          style={[styles.input, form.errors.password && styles.inputError]}
          placeholder="パスワード (8文字以上)"
          value={form.password}
          onChangeText={updatePassword}
          secureTextEntry
          editable={!isSubmitting}
        />
        {form.errors.password && (
          <Text style={styles.errorText}>{form.errors.password}</Text>
        )}

        <TextInput
          style={[styles.input, form.errors.confirmPassword && styles.inputError]}
          placeholder="パスワード確認"
          value={form.confirmPassword}
          onChangeText={updateConfirmPassword}
          secureTextEntry
          editable={!isSubmitting}
        />
        {form.errors.confirmPassword && (
          <Text style={styles.errorText}>{form.errors.confirmPassword}</Text>
        )}

        <TouchableOpacity
          style={[styles.button, styles.signUpButton]}
          onPress={handleSignUp}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>新規登録</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.backButton]}
          onPress={handleBackToLogin}
          disabled={isSubmitting}
        >
          <Text style={[styles.buttonText, styles.backButtonText]}>
            ログイン画面に戻る
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.infoSection}>
        <Text style={styles.infoText}>
          新規登録後、メールアドレスに認証コードが送信されます。{'\n'}
          迷惑メールフォルダもご確認ください。
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#007AFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  form: {
    width: '100%',
    maxWidth: 300,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: 'white',
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  signUpButton: {
    backgroundColor: '#007AFF',
  },
  backButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  backButtonText: {
    color: '#007AFF',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginBottom: 8,
    marginTop: -8,
  },
  infoSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    alignSelf: 'stretch',
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },
}); 