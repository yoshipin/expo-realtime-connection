import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          display: 'flex',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'SSE',
          // tabBarIcon: ({ size, color }) => (
          //   <MessageCircle size={size} color={color} />
          // ),
        }}
      />
      <Tabs.Screen
        name="websocket"
        options={{
          title: 'WebSocket',
          // tabBarIcon: ({ size, color }) => (
          //   <Wifi size={size} color={color} />
          // ),
        }}
      />
      <Tabs.Screen
        name="webrtc"
        options={{
          title: 'WebRTC',
          // tabBarIcon: ({ size, color }) => (
          //   <Wifi size={size} color={color} />
          // ),
        }}
      />
    </Tabs>
  );
}
