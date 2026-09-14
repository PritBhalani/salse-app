import React, { useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, Platform } from 'react-native';

// Mobile Screens
import { LoginScreen } from './src/screens/LoginScreen';
import { TodayBeatScreen } from './src/screens/TodayBeatScreen';
import { ShopDetailScreen } from './src/screens/ShopDetailScreen';
import { NewOrderScreen } from './src/screens/NewOrderScreen';
import { CollectPaymentScreen } from './src/screens/CollectPaymentScreen';
import { RegisterShopScreen } from './src/screens/RegisterShopScreen';
import { ShopOwnerHomeScreen } from './src/screens/ShopOwnerHomeScreen';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('TODAY_BEAT');
  const [selectedShop, setSelectedShop] = useState(null);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    if (user.role === 'SHOP_OWNER') {
      setCurrentScreen('SHOP_OWNER_HOME');
    } else {
      setCurrentScreen('TODAY_BEAT');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentScreen('LOGIN');
    setSelectedShop(null);
  };

  const navigateTo = (screen, shop = null) => {
    if (shop) setSelectedShop(shop);
    setCurrentScreen(screen);
  };

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#090d16" />
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#090d16" />

      {currentUser.role === 'SHOP_OWNER' ? (
        <ShopOwnerHomeScreen user={currentUser} onLogout={handleLogout} />
      ) : (
        /* Salesman Screen Flow */
        <View style={styles.screenContainer}>
          {currentScreen === 'TODAY_BEAT' && (
            <TodayBeatScreen
              user={currentUser}
              onSelectShop={(shop) => navigateTo('SHOP_DETAIL', shop)}
              onPunchOrder={(shop) => navigateTo('NEW_ORDER', shop)}
              onCollectPayment={(shop) => navigateTo('COLLECT_PAYMENT', shop)}
              onOpenRegisterShop={() => navigateTo('REGISTER_SHOP')}
              onLogout={handleLogout}
            />
          )}

          {currentScreen === 'SHOP_DETAIL' && (
            <ShopDetailScreen
              shop={selectedShop}
              onBack={() => navigateTo('TODAY_BEAT')}
              onPunchOrder={(shop) => navigateTo('NEW_ORDER', shop)}
              onCollectPayment={(shop) => navigateTo('COLLECT_PAYMENT', shop)}
            />
          )}

          {currentScreen === 'NEW_ORDER' && (
            <NewOrderScreen
              shop={selectedShop}
              onBack={() => navigateTo('SHOP_DETAIL')}
              onOrderSuccess={() => navigateTo('SHOP_DETAIL')}
            />
          )}

          {currentScreen === 'COLLECT_PAYMENT' && (
            <CollectPaymentScreen
              shop={selectedShop}
              onBack={() => navigateTo('SHOP_DETAIL')}
              onPaymentSuccess={() => navigateTo('SHOP_DETAIL')}
            />
          )}

          {currentScreen === 'REGISTER_SHOP' && (
            <RegisterShopScreen
              onBack={() => navigateTo('TODAY_BEAT')}
              onRegisterSuccess={() => navigateTo('TODAY_BEAT')}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090d16',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#090d16',
  },
});
