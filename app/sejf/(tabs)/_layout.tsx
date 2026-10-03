import { Tabs } from 'expo-router';

import { BottomBar } from '@/ui/BottomBar';

/** The vault's main screens share one always-visible bottom bar and fade into each other. */
export default function TabsLayout() {
  return (
    <Tabs
      backBehavior="firstRoute"
      tabBar={(props) => <BottomBar active={props.state.routes[props.state.index].name} />}
      screenOptions={{ headerShown: false, animation: 'fade' }}
    />
  );
}
