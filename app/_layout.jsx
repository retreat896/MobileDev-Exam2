import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function Layout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Capture',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="camera" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: 'Gallery',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="view-gallery-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tracking"
        options={{
          title: 'Tracking Colors',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="eye" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: 'Authors',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="information-outline" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
