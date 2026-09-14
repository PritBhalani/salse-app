import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage Keys
const KEYS = {
  USER_SESSION: '@salase_user_session',
  AUTH_TOKEN: '@salase_auth_token',
  CATALOG_CACHE: '@salase_catalog_cache',
  SHOPS_CACHE: '@salase_shops_cache',
  ROUTES_CACHE: '@salase_routes_cache',
  OUTBOX_ORDERS: '@salase_outbox_orders',
  OUTBOX_PAYMENTS: '@salase_outbox_payments',
  OUTBOX_VISITS: '@salase_outbox_visits',
  LAST_SYNC_TIME: '@salase_last_sync_time',
};

// =========================================================================
// 0. USER SESSION PERSISTENCE (OFFLINE AUTO-LOGIN)
// =========================================================================

export const saveUserSession = async (user, token) => {
  try {
    if (user) {
      await AsyncStorage.setItem(KEYS.USER_SESSION, JSON.stringify(user));
    }
    if (token) {
      await AsyncStorage.setItem(KEYS.AUTH_TOKEN, token);
    }
  } catch (err) {
    console.warn('Error saving user session:', err.message);
  }
};

export const getUserSession = async () => {
  try {
    const rawUser = await AsyncStorage.getItem(KEYS.USER_SESSION);
    const token = await AsyncStorage.getItem(KEYS.AUTH_TOKEN);
    return {
      user: rawUser ? JSON.parse(rawUser) : null,
      token: token || null,
    };
  } catch (err) {
    console.warn('Error reading user session:', err.message);
    return { user: null, token: null };
  }
};

export const clearUserSession = async () => {
  try {
    await AsyncStorage.removeItem(KEYS.USER_SESSION);
    await AsyncStorage.removeItem(KEYS.AUTH_TOKEN);
  } catch (err) {
    console.warn('Error clearing user session:', err.message);
  }
};

// =========================================================================
// 1. PERSISTENT CACHE FOR CATALOG & SHOPS
// =========================================================================

export const saveLocalCatalog = async (products) => {
  try {
    if (products && Array.isArray(products)) {
      await AsyncStorage.setItem(KEYS.CATALOG_CACHE, JSON.stringify(products));
      await AsyncStorage.setItem(KEYS.LAST_SYNC_TIME, new Date().toISOString());
    }
  } catch (err) {
    console.warn('Error caching catalog to local storage:', err.message);
  }
};

export const getLocalCatalog = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.CATALOG_CACHE);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Error reading local catalog cache:', err.message);
    return [];
  }
};

export const saveLocalShops = async (shops, routes = []) => {
  try {
    if (shops && Array.isArray(shops)) {
      await AsyncStorage.setItem(KEYS.SHOPS_CACHE, JSON.stringify(shops));
    }
    if (routes && Array.isArray(routes)) {
      await AsyncStorage.setItem(KEYS.ROUTES_CACHE, JSON.stringify(routes));
    }
  } catch (err) {
    console.warn('Error caching shops to local storage:', err.message);
  }
};

export const getLocalShops = async () => {
  try {
    const rawShops = await AsyncStorage.getItem(KEYS.SHOPS_CACHE);
    const rawRoutes = await AsyncStorage.getItem(KEYS.ROUTES_CACHE);
    return {
      shops: rawShops ? JSON.parse(rawShops) : [],
      routes: rawRoutes ? JSON.parse(rawRoutes) : [],
    };
  } catch (err) {
    console.warn('Error reading local shops cache:', err.message);
    return { shops: [], routes: [] };
  }
};

// =========================================================================
// 2. OFFLINE OUTBOX QUEUE (ORDERS, PAYMENTS, VISITS)
// =========================================================================

export const queueOfflineOrder = async (orderPayload) => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.OUTBOX_ORDERS);
    const list = raw ? JSON.parse(raw) : [];
    const localId = `OFFLINE-ORD-${Date.now()}`;
    const queuedOrder = {
      localId,
      ...orderPayload,
      queuedAt: new Date().toISOString(),
      syncStatus: 'PENDING',
    };
    list.push(queuedOrder);
    await AsyncStorage.setItem(KEYS.OUTBOX_ORDERS, JSON.stringify(list));
    return queuedOrder;
  } catch (err) {
    console.warn('Error queuing offline order:', err.message);
    return null;
  }
};

export const queueOfflinePayment = async (paymentPayload) => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.OUTBOX_PAYMENTS);
    const list = raw ? JSON.parse(raw) : [];
    const localId = `OFFLINE-RCP-${Date.now()}`;
    const queuedPayment = {
      localId,
      ...paymentPayload,
      queuedAt: new Date().toISOString(),
      syncStatus: 'PENDING',
    };
    list.push(queuedPayment);
    await AsyncStorage.setItem(KEYS.OUTBOX_PAYMENTS, JSON.stringify(list));
    return queuedPayment;
  } catch (err) {
    console.warn('Error queuing offline payment:', err.message);
    return null;
  }
};

export const queueOfflineVisit = async (visitPayload) => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.OUTBOX_VISITS);
    const list = raw ? JSON.parse(raw) : [];
    const localId = `OFFLINE-VISIT-${Date.now()}`;
    const queuedVisit = {
      localId,
      ...visitPayload,
      queuedAt: new Date().toISOString(),
      syncStatus: 'PENDING',
    };
    list.push(queuedVisit);
    await AsyncStorage.setItem(KEYS.OUTBOX_VISITS, JSON.stringify(list));
    return queuedVisit;
  } catch (err) {
    console.warn('Error queuing offline visit:', err.message);
    return null;
  }
};

export const getPendingOutboxCount = async () => {
  try {
    const [rawOrders, rawPayments, rawVisits] = await Promise.all([
      AsyncStorage.getItem(KEYS.OUTBOX_ORDERS),
      AsyncStorage.getItem(KEYS.OUTBOX_PAYMENTS),
      AsyncStorage.getItem(KEYS.OUTBOX_VISITS),
    ]);
    const orders = rawOrders ? JSON.parse(rawOrders) : [];
    const payments = rawPayments ? JSON.parse(rawPayments) : [];
    const visits = rawVisits ? JSON.parse(rawVisits) : [];
    return orders.length + payments.length + visits.length;
  } catch (err) {
    return 0;
  }
};

// =========================================================================
// 3. BACKGROUND / MANUAL OUTBOX SYNC ENGINE
// =========================================================================

export const syncOutboxToServer = async (mobileAPI) => {
  const syncResults = {
    syncedOrders: 0,
    syncedPayments: 0,
    syncedVisits: 0,
    errors: [],
  };

  try {
    // 1. Sync Visits
    const rawVisits = await AsyncStorage.getItem(KEYS.OUTBOX_VISITS);
    if (rawVisits) {
      const visits = JSON.parse(rawVisits);
      const remainingVisits = [];
      for (const v of visits) {
        try {
          await mobileAPI.post('/visits/check-in', {
            shopId: v.shopId,
            latitude: v.latitude,
            longitude: v.longitude,
            isMockLocationDetected: v.isMockLocationDetected || false,
            purpose: v.purpose || 'ORDER_AND_COLLECTION',
            notes: `[Offline Visit synced at ${new Date().toLocaleTimeString()}] ${v.notes || ''}`,
          });
          syncResults.syncedVisits++;
        } catch (err) {
          remainingVisits.push(v);
          syncResults.errors.push(`Visit Sync Error: ${err.message}`);
        }
      }
      await AsyncStorage.setItem(KEYS.OUTBOX_VISITS, JSON.stringify(remainingVisits));
    }

    // 2. Sync Orders
    const rawOrders = await AsyncStorage.getItem(KEYS.OUTBOX_ORDERS);
    if (rawOrders) {
      const orders = JSON.parse(rawOrders);
      const remainingOrders = [];
      for (const o of orders) {
        try {
          await mobileAPI.post('/orders', {
            shopId: o.shopId,
            billType: o.billType,
            channel: o.channel || 'IN_PERSON_BEAT',
            items: o.items,
            dispatchNotes: `[Offline Order synced at ${new Date().toLocaleTimeString()}] ${o.dispatchNotes || ''}`,
          });
          syncResults.syncedOrders++;
        } catch (err) {
          remainingOrders.push(o);
          syncResults.errors.push(`Order Sync Error: ${err.message}`);
        }
      }
      await AsyncStorage.setItem(KEYS.OUTBOX_ORDERS, JSON.stringify(remainingOrders));
    }

    // 3. Sync Payments
    const rawPayments = await AsyncStorage.getItem(KEYS.OUTBOX_PAYMENTS);
    if (rawPayments) {
      const payments = JSON.parse(rawPayments);
      const remainingPayments = [];
      for (const p of payments) {
        try {
          await mobileAPI.post('/payments', {
            shopId: p.shopId,
            billType: p.billType,
            amount: p.amount,
            mode: p.mode,
            chequeNumber: p.chequeNumber,
            chequeBank: p.chequeBank,
            chequeDate: p.chequeDate,
            chequePhotoUrl: p.chequePhotoUrl,
            upiTransactionId: p.upiTransactionId,
            notes: `[Offline Collection synced at ${new Date().toLocaleTimeString()}] ${p.notes || ''}`,
            collectionChannel: p.collectionChannel || 'IN_PERSON_BEAT',
            isWithoutVisit: p.isWithoutVisit || false,
          });
          syncResults.syncedPayments++;
        } catch (err) {
          remainingPayments.push(p);
          syncResults.errors.push(`Payment Sync Error: ${err.message}`);
        }
      }
      await AsyncStorage.setItem(KEYS.OUTBOX_PAYMENTS, JSON.stringify(remainingPayments));
    }
  } catch (globalErr) {
    syncResults.errors.push(`Sync Exception: ${globalErr.message}`);
  }

  return syncResults;
};
