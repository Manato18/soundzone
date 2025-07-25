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
import { useLoginFormHook } from './hooks/use-auth';

interface LoginScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { form, updateEmail, updatePassword, handleSubmit, isSubmitting } = useLoginFormHook();

  const handleSignUp = () => {
    navigation.navigate('SignUp');
  };

  // エラーがある場合はアラート表示（一度だけ表示するため、Refで制御）
  const shownErrorRef = React.useRef<string | null>(null);
  
  React.useEffect(() => {
    if (form.errors.general && form.errors.general !== shownErrorRef.current) {
      shownErrorRef.current = form.errors.general;
      Alert.alert('ログインエラー', form.errors.general);
    }
    // エラーがクリアされた場合はRefもクリア
    if (!form.errors.general) {
      shownErrorRef.current = null;
    }
  }, [form.errors.general]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SoundZone</Text>
      <Text style={styles.subtitle}></Text>

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
          placeholder="パスワード"
          value={form.password}
          onChangeText={updatePassword}
          secureTextEntry
          editable={!isSubmitting}
        />
        {form.errors.password && (
          <Text style={styles.errorText}>{form.errors.password}</Text>
        )}

        <TouchableOpacity
          style={[styles.button, styles.loginButton]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>ログイン</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.signUpButton]}
          onPress={handleSignUp}
          disabled={isSubmitting}
        >
          <Text style={[styles.buttonText, styles.signUpButtonText]}>
            新規登録
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
  loginButton: {
    backgroundColor: '#007AFF',
  },
  signUpButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  signUpButtonText: {
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
  warningText: {
    color: '#ff8800',
    fontSize: 13,
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
  },
  lockoutContainer: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  lockoutText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  lockoutTimer: {
    color: '#856404',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
}); 