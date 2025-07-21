import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../auth/presenter/hooks/useAuth';

export default function AccountScreen() {
  const { signOut, user, isSigningOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    Alert.alert(
      'サインアウト確認',
      'サインアウトしますか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: 'サインアウト',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await signOut();
              // サインアウト成功時の処理（自動的にログイン画面にリダイレクトされる）
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert(
                'エラー',
                'サインアウトに失敗しました。もう一度お試しください。',
                [{ text: 'OK' }]
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const isButtonDisabled = isSigningOut || isLoading;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>アカウント画面</Text>
      {user && (
        <View style={styles.userInfo}>
          <Text style={styles.email}>ログイン中: {user.email}</Text>
          {user.emailVerified ? (
            <Text style={styles.verified}>✓ メール認証済み</Text>
          ) : (
            <Text style={styles.unverified}>! メール認証が必要です</Text>
          )}
        </View>
      )}
      
      <TouchableOpacity 
        style={[
          styles.signOutButton, 
          isButtonDisabled && styles.signOutButtonDisabled
        ]} 
        onPress={handleSignOut}
        disabled={isButtonDisabled}
      >
        {isButtonDisabled ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="white" />
            <Text style={styles.signOutButtonText}>サインアウト中...</Text>
          </View>
        ) : (
          <Text style={styles.signOutButtonText}>サインアウト</Text>
        )}
      </TouchableOpacity>
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  verified: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  unverified: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '500',
  },
  signOutButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 160,
    alignItems: 'center',
  },
  signOutButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  signOutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
}); 