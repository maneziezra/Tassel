// Profile — editable details (name, phone, county, crops), real stats,
// language (English / Kiswahili), reminders, account, resources and about.

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, Icon, Text, type IconName } from '../../components/ui';
import { countIncidents, getProfile, listFarms, saveProfile, type Profile } from '../../lib/data';
import { COUNTIES, CROP_CHOICES } from '../../lib/counties';
import { signOut, useSession } from '../../lib/session';
import { useLang } from '../../lib/i18n';
import { ensurePermission, notificationsWanted, scheduleFieldReminders, setNotificationsWanted } from '../../lib/notify';
import { calendarFor, fieldTasks, loadTicks } from '../../lib/calendar';
import { hasSwahiliVoice, speak } from '../../lib/speech';
import { cropName } from '../../lib/diseases';
import { C, SHADOW } from '../../lib/theme';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { t, lang, setLang } = useLang();
  const { session, isAnonymous, email } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', county: '', crops: '' });
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [countyPicker, setCountyPicker] = useState(false);
  const [stats, setStats] = useState({ fields: 0, scans: 0, days: 0 });
  const [notify, setNotify] = useState(true);
  const [swVoice, setSwVoice] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, farms, scans] = await Promise.all([getProfile(), listFarms(), countIncidents()]);
      setProfile(p);
      setForm({ name: p.name ?? '', phone: p.phone ?? '', county: p.county ?? '', crops: p.crops ?? '' });
      const since = session?.user.created_at ?? p.created_at;
      setStats({ fields: farms.length, scans, days: since ? Math.max(1, Math.ceil((Date.now() - new Date(since).getTime()) / 86400000)) : 1 });
    } catch {
      // offline: keep what we have
    }
  }, [session?.user.created_at]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    notificationsWanted().then(setNotify);
    hasSwahiliVoice().then(setSwVoice);
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await saveProfile(form);
      setEdit(false);
      await load();
    } catch (e) {
      Alert.alert(t('Could not save'), e instanceof Error ? e.message : '');
    } finally {
      setSaving(false);
    }
  };

  const toggleNotify = async (on: boolean) => {
    if (on && !(await ensurePermission())) {
      Alert.alert(t('Notifications are off'), t('Allow notifications for CropGuard in your phone settings to get reminders.'));
      return;
    }
    setNotify(on);
    await setNotificationsWanted(on);
    if (on) {
      // Turning reminders back on re-creates them for every field with a crop calendar.
      try {
        for (const f of await listFarms()) {
          if (f.planting_date && calendarFor(f.crop)) await scheduleFieldReminders(f.id, fieldTasks(f, await loadTicks(f.id), lang));
        }
      } catch {
        // offline: reminders are re-created the next time a field is opened
      }
    }
  };

  const crops = form.crops ? form.crops.split(',').map((c) => c.trim()).filter(Boolean) : [];
  const toggleCrop = (c: string) => {
    const next = crops.includes(c) ? crops.filter((x) => x !== c) : [...crops, c];
    setForm({ ...form, crops: next.join(', ') });
  };

  const doSignOut = () =>
    Alert.alert(t('Sign out?'), t('Your data stays in your account. This phone will start a new guest session.'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Sign out'), style: 'destructive', onPress: () => signOut().then(load) },
    ]);

  const displayName = profile?.name || t('Farmer');
  const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const version = Constants.expoConfig?.version ?? '2.1.0';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={[st.hero, { paddingTop: insets.top + 24 }]}>
        <View style={st.avatar}>
          <Text raw style={st.avatarTxt}>
            {initials}
          </Text>
        </View>
        <Text raw style={st.name}>
          {displayName}
        </Text>
        <Text raw style={st.email}>
          {isAnonymous ? t('Guest — data is linked to this phone') : email}
        </Text>
        <View style={st.ksef}>
          <Icon name="trophy-outline" size={13} color="#E67E22" />
          <Text style={st.ksefTxt}>KSEF 2027 project</Text>
        </View>
      </View>

      <View style={st.stats}>
        {[
          { v: stats.fields, l: 'Fields', i: 'sprout' as IconName },
          { v: stats.scans, l: 'Saved scans', i: 'leaf' as IconName },
          { v: stats.days, l: 'Days', i: 'calendar-check' as IconName },
        ].map((x) => (
          <View key={x.l} style={st.stat}>
            <Icon name={x.i} size={20} color={C.primary} />
            <Text raw style={st.statV}>
              {x.v}
            </Text>
            <Text style={st.statL}>{x.l}</Text>
          </View>
        ))}
      </View>

      {/* Language */}
      <Text style={[st.sectionTitle, st.sectionPad]}>Language / Lugha</Text>
      <View style={st.card}>
        <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 10 }}>
          <TouchableOpacity style={[st.langBtn, lang === 'en' && st.langOn]} onPress={() => setLang('en')}>
            <Text raw style={[st.langTxt, lang === 'en' && { color: '#fff' }]}>
              English
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.langBtn, lang === 'sw' && st.langOn]} onPress={() => setLang('sw')}>
            <Text raw style={[st.langTxt, lang === 'sw' && { color: '#fff' }]}>
              Kiswahili
            </Text>
          </TouchableOpacity>
        </View>
        <Row
          icon="volume-high"
          label="Test the read-aloud voice"
          sub={lang === 'sw' ? (swVoice ? t('Kiswahili voice installed') : t('No Kiswahili voice — install it in phone settings for a better voice')) : undefined}
          onPress={() => speak(t('Welcome to CropGuard. Scan a leaf to check your crop.'), { lang })}
        />
      </View>

      {/* Personal details */}
      <View style={st.sectionHead}>
        <Text style={st.sectionTitle}>Personal details</Text>
        <TouchableOpacity onPress={() => (edit ? save() : setEdit(true))} disabled={saving}>
          <Text style={st.editLink}>{edit ? (saving ? 'Saving…' : 'Save') : 'Edit'}</Text>
        </TouchableOpacity>
      </View>
      <View style={st.card}>
        <Field icon="account-outline" label={t('Full name')} value={form.name} edit={edit} onChange={(v) => setForm({ ...form, name: v })} />
        <Field icon="phone-outline" label={t('Phone number')} value={form.phone} edit={edit} onChange={(v) => setForm({ ...form, phone: v })} keyboard="phone-pad" />
        <TouchableOpacity disabled={!edit} onPress={() => setCountyPicker(true)}>
          <Field icon="map-marker-outline" label={t('County')} value={form.county} edit={false} placeholder={edit ? t('Tap to choose') : undefined} />
        </TouchableOpacity>
        <View style={st.row}>
          <Icon name="sprout" size={20} color={C.primary} style={{ width: 26 }} />
          <View style={{ flex: 1 }}>
            <Text style={st.label}>Crops grown</Text>
            {edit ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {CROP_CHOICES.map((c) => (
                  <Chip key={c} label={c} active={crops.includes(c)} onPress={() => toggleCrop(c)} />
                ))}
              </View>
            ) : (
              <Text raw style={st.value}>
                {crops.length ? crops.map((c) => cropName(c)).join(', ') : '—'}
              </Text>
            )}
          </View>
        </View>
        {!edit && !form.county ? (
          <Text style={st.countyHint}>Set your county to get outbreak alerts and local farmer prices.</Text>
        ) : null}
        {edit ? (
          <TouchableOpacity onPress={() => { setEdit(false); load(); }}>
            <Text style={[st.editLink, { color: C.textSub, textAlign: 'center', marginTop: 8 }]}>Cancel</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Alerts & reminders */}
      <Text style={[st.sectionTitle, st.sectionPad]}>Alerts & reminders</Text>
      <View style={st.card}>
        <View style={st.actionRow}>
          <View style={[st.actionIcon, { backgroundColor: C.primaryTint }]}>
            <Icon name="bell-outline" size={18} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.actionTxt}>Notifications</Text>
            <Text style={st.actionSub}>Crop calendar reminders and outbreak alerts in your county</Text>
          </View>
          <Switch value={notify} onValueChange={toggleNotify} trackColor={{ true: C.secondary, false: C.border }} thumbColor={notify ? C.primary : '#f4f3f4'} />
        </View>
        <Row icon="calendar-check-outline" label="Crop calendar" onPress={() => router.push('/calendar')} />
        <Row icon="alert-decagram-outline" label="Outbreak alerts" onPress={() => router.push('/outbreaks')} />
      </View>

      {/* Account */}
      <Text style={[st.sectionTitle, st.sectionPad]}>Account</Text>
      <View style={st.card}>
        {isAnonymous ? (
          <>
            <Row icon="shield-account-outline" label="Back up with email & password" sub="Keep your fields and scans if you change phone" onPress={() => router.push('/register')} />
            <Row icon="login" label="Sign in to an existing account" onPress={() => router.push('/login')} />
          </>
        ) : (
          <>
            <Row icon="email-outline" label={email ?? ''} sub="Signed in" raw />
            <Row icon="logout" label="Sign out" danger onPress={doSignOut} />
          </>
        )}
      </View>

      {/* Resources */}
      <Text style={[st.sectionTitle, st.sectionPad]}>Resources</Text>
      <View style={st.card}>
        <Row icon="bookshelf" label="Disease & pest library" onPress={() => router.push('/encyclopedia')} />
        <Row icon="chart-line" label="Market prices & agro-dealers" onPress={() => router.push('/market')} />
        <Row icon="flask-outline" label="How CropGuard works (methodology)" onPress={() => router.push('/methodology')} />
        <Row icon="web" label="Ministry of Agriculture" sub="kilimo.go.ke" onPress={() => Linking.openURL('https://kilimo.go.ke')} />
        <Row icon="shield-check-outline" label="Check if a pesticide is registered" sub="Pest Control Products Board — pcpb.go.ke" onPress={() => Linking.openURL('https://www.pcpb.go.ke')} />
      </View>

      {/* About */}
      <Text style={[st.sectionTitle, st.sectionPad]}>About</Text>
      <View style={st.card}>
        <Row icon="information-outline" label="App version" sub={`${version} (KSEF 2027)`} />
        <Row
          icon="shield-lock-outline"
          label="Privacy"
          onPress={() =>
            Alert.alert(
              t('Your data'),
              t(
                'Leaf photos are analysed on this phone and are not uploaded unless you attach one to a community post or choose the AI photo check (that photo is checked by the AI and not kept). Your profile, fields, saved scans, price reports and forum posts are stored in your CropGuard account (Supabase, EU region). Outbreak alerts and farmer prices only show anonymous totals. Chat questions are sent to the AI advisor to answer them. No ads. We do not sell your data.'
              )
            )
          }
        />
      </View>

      <Modal visible={countyPicker} transparent animationType="slide" onRequestClose={() => setCountyPicker(false)}>
        <Pressable style={st.overlay} onPress={() => setCountyPicker(false)}>
          <Pressable style={st.sheet}>
            <Text style={st.sheetTitle}>Choose your county</Text>
            <FlatList
              data={COUNTIES}
              keyExtractor={(c) => c}
              style={{ maxHeight: 420 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={st.countyRow} onPress={() => { setForm({ ...form, county: item }); setCountyPicker(false); }}>
                  <Text raw style={[st.value, form.county === item && { color: C.primary, fontWeight: '900' }]}>
                    {item}
                  </Text>
                  {form.county === item ? <Icon name="check" size={18} color={C.primary} /> : null}
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function Field({ icon, label, value, edit, onChange, keyboard, placeholder }: { icon: IconName; label: string; value: string; edit: boolean; onChange?: (t: string) => void; keyboard?: 'phone-pad'; placeholder?: string }) {
  return (
    <View style={st.row}>
      <Icon name={icon} size={20} color={C.primary} style={{ width: 26 }} />
      <View style={{ flex: 1 }}>
        <Text raw style={st.label}>
          {label}
        </Text>
        {edit ? (
          <TextInput style={st.input} value={value} onChangeText={onChange} keyboardType={keyboard ?? 'default'} autoCapitalize="words" />
        ) : (
          <Text raw style={[st.value, !value && placeholder ? { color: C.primary } : null]}>
            {value || placeholder || '—'}
          </Text>
        )}
      </View>
    </View>
  );
}

function Row({ icon, label, sub, onPress, danger, raw }: { icon: IconName; label: string; sub?: string; onPress?: () => void; danger?: boolean; raw?: boolean }) {
  return (
    <TouchableOpacity style={st.actionRow} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
      <View style={[st.actionIcon, { backgroundColor: danger ? C.errorTint : C.primaryTint }]}>
        <Icon name={icon} size={18} color={danger ? C.error : C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text raw={raw} style={[st.actionTxt, danger && { color: C.error }]}>
          {label}
        </Text>
        {sub ? <Text style={st.actionSub}>{sub}</Text> : null}
      </View>
      {onPress && !danger ? <Icon name="chevron-right" size={18} color={C.textLight} /> : null}
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  hero: { alignItems: 'center', paddingBottom: 24, backgroundColor: C.surface },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', ...SHADOW },
  avatarTxt: { fontSize: 32, fontWeight: '900', color: '#fff' },
  name: { fontSize: 22, fontWeight: '900', color: C.text, marginTop: 12 },
  email: { fontSize: 13, color: C.textSub, marginTop: 3 },
  ksef: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF8E1', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginTop: 10 },
  ksefTxt: { fontSize: 12, color: '#E67E22', fontWeight: '800' },
  stats: { flexDirection: 'row', backgroundColor: C.surface, marginHorizontal: 16, marginTop: 12, borderRadius: 16, paddingVertical: 16, ...SHADOW },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statV: { fontSize: 22, fontWeight: '900', color: C.text },
  statL: { fontSize: 12, color: C.textSub, fontWeight: '600' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 24, marginBottom: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: C.textSub, textTransform: 'uppercase', letterSpacing: 1 },
  sectionPad: { paddingHorizontal: 20, marginTop: 24, marginBottom: 8 },
  editLink: { fontSize: 14, fontWeight: '900', color: C.primary },
  card: { backgroundColor: C.surface, marginHorizontal: 16, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 6, ...SHADOW },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, gap: 6 },
  label: { fontSize: 11, color: C.textSub, marginBottom: 2 },
  value: { fontSize: 15, color: C.text, fontWeight: '600' },
  countyHint: { fontSize: 12, color: C.warn, fontWeight: '700', paddingBottom: 8 },
  input: { fontSize: 15, color: C.text, fontWeight: '600', paddingVertical: 4, borderBottomWidth: 1.5, borderBottomColor: C.primary },
  langBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: C.border },
  langOn: { backgroundColor: C.primary, borderColor: C.primary },
  langTxt: { fontSize: 15, fontWeight: '800', color: C.textMid },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  actionIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  actionTxt: { fontSize: 15, fontWeight: '600', color: C.text },
  actionSub: { fontSize: 12, color: C.textSub, marginTop: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: C.text, marginBottom: 8 },
  countyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
});
