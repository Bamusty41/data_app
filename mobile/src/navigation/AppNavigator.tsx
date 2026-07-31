import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthScreen } from '../screens/AuthScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { PurchaseScreen } from '../screens/PurchaseScreen';
import { TransactionHistoryScreen } from '../screens/TransactionHistoryScreen';

export type RootStackParamList = {
  Auth: undefined;
  Dashboard: undefined;
  Purchase: { serviceType: 'DATA' | 'AIRTIME' };
  History: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Auth" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Purchase" component={PurchaseScreen} />
        <Stack.Screen name="History" component={TransactionHistoryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
