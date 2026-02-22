// @ts-nocheck
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { Colors, Typography } from '../styles/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary.main },
        headerTintColor: Colors.neutral.white,
        headerTitleStyle: {
          fontWeight: Typography.fontWeight.semibold,
          fontSize: Typography.fontSize.lg,
        },
        headerShadowVisible: false,
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: '登录' }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: '注册' }}
      />
    </Stack.Navigator>
  );
}
