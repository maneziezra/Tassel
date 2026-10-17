// Navigation: Home | Advisory | Scan (raised) | Community | Profile
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, tick, type IconName } from '../../components/ui';
import { C, FONT } from '../../lib/theme';
import { useLang } from '../../lib/i18n';

function tabIcon(name: IconName, active: IconName) {
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => <Icon name={focused ? active : name} size={25} color={color as string} />;
}

/** One line, shrinks to fit: "Community" and "Jamii" never get cut to "Commu…". */
function tabLabel(text: string) {
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ color: color as string, fontSize: 12, fontFamily: focused ? FONT.bodyBold : FONT.body, marginTop: 2 }}>
      {text}
    </Text>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  return (
    <Tabs
      screenListeners={{ tabPress: () => tick('select') }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primaryDark,
        tabBarInactiveTintColor: C.textSub,
        tabBarStyle: { height: 64 + insets.bottom, paddingBottom: 8 + insets.bottom, paddingTop: 6, borderTopWidth: 0, backgroundColor: C.surface, elevation: 0 },
        tabBarItemStyle: { paddingHorizontal: 0 },
        animation: 'fade',
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('Home'), tabBarLabel: tabLabel(t('Home')), tabBarIcon: tabIcon('home-outline', 'home') }} />
      <Tabs.Screen name="advisory" options={{ title: t('Advisory'), tabBarLabel: tabLabel(t('Advisory')), tabBarIcon: tabIcon('sprout-outline', 'sprout') }} />
      <Tabs.Screen
        name="scan"
        options={{
          title: t('Scan'),
          tabBarLabel: () => null,
          tabBarStyle: { display: 'none' },
          tabBarButton: (props) => (
            <Pressable onPress={props.onPress} accessibilityLabel={t('Scan a leaf')} accessibilityRole="button" style={styles.fabWrap}>
              <View style={styles.fab}>
                <Icon name="line-scan" size={28} color={C.gold} />
              </View>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen name="community" options={{ title: t('Community'), tabBarLabel: tabLabel(t('Community')), tabBarIcon: tabIcon('message-text-outline', 'message-text') }} />
      <Tabs.Screen name="profile" options={{ title: t('Profile'), tabBarLabel: tabLabel(t('Profile')), tabBarIcon: tabIcon('account-circle-outline', 'account-circle') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fabWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -22,
    borderWidth: 4,
    borderColor: C.bg,
  },
});
