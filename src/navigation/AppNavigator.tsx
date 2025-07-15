import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';

// SoundZoneアプリの各画面コンポーネント
import AccountScreen from '../features/account/presentation/AccountScreen';
import HomeScreen from '../features/home/presentation/HomeScreen';
import LayersScreen from '../features/layers/presentation/LayersScreen';
import MyPinScreen from '../features/mypin/presentation/MyPinScreen';
import RecordingScreen from '../features/recording/presentation/RecordingScreen';

const Tab = createBottomTabNavigator();

// タブのアイコン設定
const getTabIcon = (routeName: string, focused: boolean): keyof typeof Ionicons.glyphMap => {
  const iconMap: Record<string, { focused: keyof typeof Ionicons.glyphMap; unfocused: keyof typeof Ionicons.glyphMap }> = {
    Home: { focused: 'map', unfocused: 'map-outline' },
    MyPin: { focused: 'location', unfocused: 'location-outline' },
    Layers: { focused: 'layers', unfocused: 'layers-outline' },
    Recording: { focused: 'mic', unfocused: 'mic-outline' },
    Account: { focused: 'person', unfocused: 'person-outline' },
  };

  return iconMap[routeName] ? iconMap[routeName][focused ? 'focused' : 'unfocused'] : 'home-outline';
};

// SoundZone タブナビゲーター
export default function AppNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const iconName = getTabIcon(route.name, focused);
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopWidth: 0,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          color: '#fff',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="MyPin" 
        component={MyPinScreen}
        options={{ tabBarLabel: 'MyPin' }}
      />
      <Tab.Screen 
        name="Layers" 
        component={LayersScreen}
        options={{ tabBarLabel: 'レイヤー' }}
      />
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ tabBarLabel: 'ホーム' }}
      />
      <Tab.Screen 
        name="Recording" 
        component={RecordingScreen}
        options={{ tabBarLabel: '録音' }}
      />
      <Tab.Screen 
        name="Account" 
        component={AccountScreen}
        options={{ tabBarLabel: 'アカウント' }}
      />
    </Tab.Navigator>
  );
} 