// Same navigation as the v1.0 release: Home | Advisory | Scan (green button) | Community | Profile
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../components/ui';
import { C, FONT } from '../../lib/theme';
import { useLang } from '../../lib/i18n';

function tabIcon(name: IconName, active: IconName) {
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => <Icon name={focused ? active : name} size={24} color={color as string} />;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textSub,
        tabBarStyle: { height: 62 + insets.bottom, paddingBottom: 8 + insets.bottom, paddingTop: 6, borderTopColor: C.border, backgroundColor: C.surface },
        tabBarLabelStyle: { fontSize: 12, fontFamily: FONT.bodyBold },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('Home'), tabBarIcon: tabIcon('home-outline', 'home') }} />
      <Tabs.Screen name="advisory" options={{ title: t('Advisory'), tabBarIcon: tabIcon('book-open-variant', 'book-open-page-variant') }} />
      <Tabs.Screen
        name="scan"
        options={{
          title: t('Scan'),
          tabBarLabel: () => null,
          tabBarStyle: { display: 'none' },
          tabBarButton: (props) => (
            <Pressable onPress={props.onPress} accessibilityLabel={t('Scan a leaf')} style={styles.fabWrap}>
              <View style={styles.fab}>
                <Icon name="line-scan" size={28} color={C.text} />
              </View>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen name="community" options={{ title: t('Community'), tabBarIcon: tabIcon('forum-outline', 'forum') }} />
      <Tabs.Screen name="profile" options={{ title: t('Profile'), tabBarIcon: tabIcon('account-outline', 'account') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fabWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: C.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -22,
    borderWidth: 4,
    borderColor: C.bg,
    shadowColor: C.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
});
