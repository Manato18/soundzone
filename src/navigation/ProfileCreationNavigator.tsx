import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProfileCreationScreen from '../features/account/presentation/screens/ProfileCreationScreen';

export type ProfileCreationStackParamList = {
  ProfileCreation: undefined;
};

const Stack = createStackNavigator<ProfileCreationStackParamList>();

export default function ProfileCreationNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // ヘッダーを非表示
      }}
    >
      <Stack.Screen 
        name="ProfileCreation" 
        component={ProfileCreationScreen}
      />
    </Stack.Navigator>
  );
}