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
import { useSignUpFormHook } from '../presenter/hooks/useAuth';

interface SignUpScreenProps {
  navigation: {
    navigate: (screen: string) => void;
    goBack: () => void;
  };
}

export default function SignUpScreen({ navigation }: SignUpScreenProps) {
  const { form, actions, isSubmitting } = useSignUpFormHook();

  const handleBackToLogin = () => {
    navigation.goBack();
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
          onChangeText={actions.updateEmail}
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
          onChangeText={actions.updatePassword}
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
          onChangeText={actions.updateConfirmPassword}
          secureTextEntry
          editable={!isSubmitting}
        />
        {form.errors.confirmPassword && (
          <Text style={styles.errorText}>{form.errors.confirmPassword}</Text>
        )}

        <TouchableOpacity
          style={[styles.button, styles.signUpButton]}
          onPress={actions.handleSubmit}
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
}); 