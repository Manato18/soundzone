import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import EmailVerificationScreen from '../features/auth/presentation/EmailVerificationScreen';
import LoginScreen from '../features/auth/presentation/LoginScreen';
import SignUpScreen from '../features/auth/presentation/SignUpScreen';

// AuthStackの型定義
export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  EmailVerification: {
    email: string;
  };
};

const Stack = createStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
    </Stack.Navigator>
  );
} 