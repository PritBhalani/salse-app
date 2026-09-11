import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { playWarehouseAlert } from '../components/AudioAlert';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const newSocket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('⚡ Connected to real-time notification socket');
      setIsConnected(true);
      newSocket.emit('join:warehouse');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Real-time order placed by salesman
    newSocket.on('order:new', (orderData) => {
      console.log('🔔 Live Order Received in Warehouse:', orderData);
      playWarehouseAlert();

      const newAlert = {
        id: Date.now(),
        type: 'NEW_ORDER',
        title: 'New Order Received!',
        message: `${orderData.shopName} (${orderData.city}) - ₹${orderData.totalAmount.toLocaleString()} punched by ${orderData.salesmanName}`,
        order: orderData,
        timestamp: new Date(),
      };

      setAlerts((prev) => [newAlert, ...prev].slice(0, 8));

      // Auto dismiss after 8 seconds
      setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a.id !== newAlert.id));
      }, 8000);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  const dismissAlert = (id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, alerts, dismissAlert }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
