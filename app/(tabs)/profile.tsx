// Profile — a farmer's own page. Choose how you appear (initials or a crop,
// on a tone you like), name your farm, pick acres or hectares, set your county
// and crops, language, reminders, account, resources and about.

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Linking, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Chip, CropIcon, Icon, Press, Segmented, Sheet, StatusShade, Text, tick, type IconName } from '../../components/ui';
import { countIncidents, getProfile, listFarms, saveProfile, type Profile } from '../../lib/data';
import { COUNTIES, CROP_CHOICES } from '../../lib/counties';
import { signOut, useSession } from '../../lib/session';
import { useLang } from '../../lib/i18n';
import { ensurePermission, notificationsWanted, scheduleFieldReminders, setNotificationsWanted } from '../../lib/notify';
import { calendarFor, fieldTasks, loadTicks } from '../../lib/calendar';
import { hasSwahiliVoice, speak } from '../../lib/speech';
import { cropName } from '../../lib/diseases';
import { AVATAR_TONES, setPrefs, usePrefs } from '../../lib/prefs';
import { C, FONT } from '../../lib/theme';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { t, lang, setLang } = useLang();
  const prefs = usePrefs();
  const { session, isAnonymous, email } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', county: '', crops: '' });
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [countyPicker, setCountyPicker] = useState(false);
  const [avatarSheet, setAvatarSheet] = useState(false);
  const [farmName, setFarmName] = useState('');
  const [stats, setStats] = useState({ fields: 0, scans: 0, days: 0, acres: 0 });
  const [notify, setNotify] = useState(true);
  const [swVoice, setSwVoice] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, farms, scans] = await Promise.all([getProfile(), listFarms(), countIncidents()]);
      setProfile(p);
      setForm({ name: p.name ?? '', phone: p.phone ?? '', county: p.county ?? '', crops: p.crops ?? '' });
      const since = session?.user.created_at ?? p.created_at;
      setStats({
        fields: farms.length,
        scans,
        days: since ? Math.max(1, Math.ceil((Date.now() - new Date(since).getTime()) / 86400000)) : 1,
        acres: farms.reduce((a, f) => a + (Number(f.size_acres) || 0), 0),
      });
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
  useEffect(() => setFarmName(prefs.farmName), [prefs.farmName]);

  const save = async (next = form) => {
    setSaving(true);
    try {
      await saveProfile(next);
      setEdit(false);
      tick('success');
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
  const version = Constants.expoConfig?.version ?? '2.2.0';
  const since = session?.user.created_at ?? profile?.created_at;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={[]}
        renderItem={null}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 48 }}
        ListHeaderComponent={
          <>
            {/* Identity */}
            <View style={[st.hero, { paddingTop: insets.top + 24 }]}>
              <Press onPress={() => setAvatarSheet(true)} accessibilityLabel={t('Change your picture')} style={{ alignItems: 'center' }}>
                <View style={[st.avatar, { backgroundColor: prefs.avatarTone }]}>
                  {prefs.avatarCrop ? <CropIcon crop={prefs.avatarCrop} size={76} disc={false} /> : <Text raw style={st.avatarTxt}>{initials}</Text>}
                </View>
                <View style={st.avatarEdit}>
                  <Icon name="pencil" size={14} color={C.text} />
                </View>
              </Press>
              <Text raw style={st.name}>
                {displayName}
              </Text>
              <Text raw style={st.sub}>
                {[prefs.farmName || null, form.county ? t('{county} County', { county: form.county }) : null].filter(Boolean).join(' · ') ||
                  (isAnonymous ? t('Guest — data is linked to this phone') : email)}
              </Text>
              <View style={st.stats}>
                {[
                  { v: String(stats.fields), l: 'fields' },
                  { v: stats.acres ? (prefs.units === 'hectares' ? (stats.acres * 0.4047).toFixed(1) : stats.acres.toFixed(1)) : '0', l: prefs.units === 'hectares' ? 'hectares' : 'acres' },
                  { v: String(stats.scans), l: 'scans' },
                  { v: String(stats.days), l: 'days' },
                ].map((x) => (
                  <View key={x.l} style={st.stat}>
                    <Text raw style={st.statV}>
                      {x.v}
                    </Text>
                    <Text style={st.statL}>{x.l}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Farm */}
            <Section title="Your farm" action={edit ? (saving ? 'Saving…' : 'Save') : 'Edit'} onAction={() => (edit ? save() : setEdit(true))} />
            <View style={st.card}>
              <View style={st.item}>
                <Text style={st.itemLbl}>Farm name</Text>
                <TextInput
                  style={st.inlineInput}
                  value={farmName}
                  onChangeText={setFarmName}
                  onEndEditing={() => setPrefs({ farmName: farmName.trim() })}
                  placeholder={t('e.g. Kapsoya shamba')}
                  placeholderTextColor={C.textLight}
                  returnKeyType="done"
                  maxLength={40}
                />
              </View>
              <TouchableOpacity style={st.item} disabled={!edit} onPress={() => setCountyPicker(true)}>
                <Text style={st.itemLbl}>County</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text raw style={[st.itemVal, !form.county && { color: edit ? C.primary : C.textLight }]}>
                    {form.county || (edit ? t('Choose') : t('Not set'))}
                  </Text>
                  {edit ? <Icon name="chevron-right" size={18} color={C.textLight} /> : null}
                </View>
              </TouchableOpacity>
              <View style={[st.item, { flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
                <Text style={st.itemLbl}>Crops you grow</Text>
                {edit ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {CROP_CHOICES.map((c) => (
                      <Chip key={c} crop={c} label={cropName(c)} raw active={crops.includes(c)} onPress={() => toggleCrop(c)} />
                    ))}
                  </View>
                ) : crops.length ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                    {crops.map((c) => (
                      <View key={c} style={{ alignItems: 'center', gap: 4, width: 60 }}>
                        <CropIcon crop={c} size={48} />
                        <Text raw style={st.cropLbl} numberOfLines={1}>
                          {cropName(c)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={[st.itemVal, { color: C.textLight, textAlign: 'left' }]}>Tap Edit to add your crops</Text>
                )}
              </View>
              <View style={st.item}>
                <Text style={st.itemLbl}>Measure land in</Text>
                <Segmented
                  value={prefs.units}
                  onChange={(u) => setPrefs({ units: u })}
                  options={[
                    { value: 'acres', label: 'Acres' },
                    { value: 'hectares', label: 'Hectares' },
                  ]}
                  style={{ width: 180 }}
                />
              </View>
              {!edit && !form.county ? <Text style={st.hint}>Set your county to get outbreak alerts and local farmer prices.</Text> : null}
            </View>

            {/* Personal */}
            <Section title="Personal details" />
            <View style={st.card}>
              <View style={st.item}>
                <Text style={st.itemLbl}>Full name</Text>
                {edit ? (
                  <TextInput style={st.inlineInput} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} autoCapitalize="words" placeholder={t('Your name')} placeholderTextColor={C.textLight} />
                ) : (
                  <Text raw style={st.itemVal}>
                    {form.name || '—'}
                  </Text>
                )}
              </View>
              <View style={st.item}>
                <Text style={st.itemLbl}>Phone number</Text>
                {edit ? (
                  <TextInput style={st.inlineInput} value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" placeholder="07…" placeholderTextColor={C.textLight} />
                ) : (
                  <Text raw style={st.itemVal}>
                    {form.phone || '—'}
                  </Text>
                )}
              </View>
              {edit ? (
                <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 10 }}>
                  <Btn label="Cancel" kind="secondary" onPress={() => { setEdit(false); load(); }} style={{ flex: 1 }} />
                  <Btn label="Save" loading={saving} onPress={() => save()} style={{ flex: 1 }} />
                </View>
              ) : null}
            </View>

            {/* Language */}
            <Section title="Language / Lugha" />
            <View style={st.card}>
              <View style={{ paddingVertical: 12 }}>
                <Segmented
                  value={lang}
                  onChange={(l) => setLang(l)}
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'sw', label: 'Kiswahili' },
                  ]}
                />
              </View>
              <Row
                icon="volume-high"
                label="Test the read-aloud voice"
                sub={lang === 'sw' ? (swVoice ? t('Kiswahili voice installed') : t('No Kiswahili voice — install it in phone settings for a better voice')) : undefined}
                onPress={() => speak(t('Welcome to CropGuard. Scan a leaf to check your crop.'), { lang })}
              />
            </View>

            {/* Alerts */}
            <Section title="Alerts and reminders" />
            <View style={st.card}>
              <View style={st.rowItem}>
                <Icon name="bell-outline" size={22} color={C.text} />
                <View style={{ flex: 1 }}>
                  <Text style={st.rowTxt}>Notifications</Text>
                  <Text style={st.rowSub}>Calendar reminders and outbreak alerts in your county</Text>
                </View>
                <Switch value={notify} onValueChange={toggleNotify} trackColor={{ true: C.secondary, false: C.sunken }} thumbColor={notify ? C.primary : '#FFFFFF'} />
              </View>
              <Row icon="calendar-check-outline" label="Crop calendar" onPress={() => router.push('/calendar')} />
              <Row icon="map-marker-radius-outline" label="Outbreak alerts" onPress={() => router.push('/outbreaks')} />
            </View>

            {/* Account */}
            <Section title="Account" />
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
            <Section title="Resources" />
            <View style={st.card}>
              <Row icon="book-open-variant" label="Disease & pest library" onPress={() => router.push('/encyclopedia')} />
              <Row icon="chart-line" label="Market prices & agro-dealers" onPress={() => router.push('/market')} />
              <Row icon="flask-outline" label="How CropGuard works (methodology)" onPress={() => router.push('/methodology')} />
              <Row icon="web" label="Ministry of Agriculture" sub="kilimo.go.ke" onPress={() => Linking.openURL('https://kilimo.go.ke')} />
              <Row icon="shield-check-outline" label="Check if a pesticide is registered" sub="Pest Control Products Board — pcpb.go.ke" onPress={() => Linking.openURL('https://www.pcpb.go.ke')} />
            </View>

            {/* About */}
            <Section title="About" />
            <View style={st.card}>
              <Row icon="information-outline" label="App version" sub={`${version} · ${t('KSEF 2027 project')}`} />
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
              {since ? <Row icon="calendar-blank-outline" label={t('Member since {date}', { date: new Date(since).toLocaleDateString(lang === 'sw' ? 'sw-KE' : 'en-KE', { month: 'long', year: 'numeric' }) })} raw /> : null}
            </View>
          </>
        }
      />

      <StatusShade />

      {/* Avatar picker */}
      <Sheet visible={avatarSheet} onClose={() => setAvatarSheet(false)} title="Your picture">
        <Text style={st.sheetLbl}>Show as</Text>
        <View style={st.avatarGrid}>
          <TouchableOpacity
            style={[st.avatarOpt, !prefs.avatarCrop && st.avatarOptOn, { backgroundColor: prefs.avatarTone }]}
            onPress={() => {
              tick('select');
              setPrefs({ avatarCrop: null });
            }}
            accessibilityLabel={t('Initials')}
          >
            <Text raw style={[st.avatarTxt, { fontSize: 20 }]}>
              {initials}
            </Text>
          </TouchableOpacity>
          {['Maize', 'Potato', 'Tomato', 'Beans', 'Wheat', 'Kale', 'Cabbage', 'Avocado', 'Banana', 'Onion', 'Capsicum'].map((c) => (
            <TouchableOpacity
              key={c}
              style={[st.avatarOpt, prefs.avatarCrop === c && st.avatarOptOn, { backgroundColor: prefs.avatarTone }]}
              onPress={() => {
                tick('select');
                setPrefs({ avatarCrop: c });
              }}
              accessibilityLabel={cropName(c)}
            >
              <CropIcon crop={c} size={44} disc={false} />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[st.sheetLbl, { marginTop: 18 }]}>Background</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          {AVATAR_TONES.map((tone) => (
            <TouchableOpacity
              key={tone}
              onPress={() => {
                tick('select');
                setPrefs({ avatarTone: tone });
              }}
              style={[st.tone, { backgroundColor: tone }, prefs.avatarTone === tone && st.toneOn]}
              accessibilityLabel={t('Colour')}
              accessibilityState={{ selected: prefs.avatarTone === tone }}
            />
          ))}
        </View>
        <Btn label="Done" onPress={() => setAvatarSheet(false)} />
      </Sheet>

      {/* County picker */}
      <Sheet visible={countyPicker} onClose={() => setCountyPicker(false)} title="Choose your county">
        <FlatList
          data={COUNTIES}
          keyExtractor={(c) => c}
          style={{ maxHeight: 420 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={st.countyRow}
              onPress={() => {
                tick('select');
                setForm({ ...form, county: item });
                setCountyPicker(false);
              }}
            >
              <Text raw style={[st.itemVal, form.county === item && { color: C.primary, fontFamily: FONT.bodyBold }]}>
                {item}
              </Text>
              {form.county === item ? <Icon name="check" size={20} color={C.primary} /> : null}
            </TouchableOpacity>
          )}
        />
      </Sheet>
    </View>
  );
}

function Section({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={st.sectionHead}>
      <Text style={st.sectionTitle}>{title}</Text>
      {action ? (
        <TouchableOpacity onPress={onAction} hitSlop={10}>
          <Text style={st.editLink}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function Row({ icon, label, sub, onPress, danger, raw }: { icon: IconName; label: string; sub?: string; onPress?: () => void; danger?: boolean; raw?: boolean }) {
  return (
    <TouchableOpacity style={st.rowItem} onPress={onPress} disabled={!onPress} activeOpacity={0.6}>
      <Icon name={icon} size={22} color={danger ? C.error : C.text} />
      <View style={{ flex: 1 }}>
        <Text raw={raw} style={[st.rowTxt, danger && { color: C.error }]}>
          {label}
        </Text>
        {sub ? <Text style={st.rowSub}>{sub}</Text> : null}
      </View>
      {onPress && !danger ? <Icon name="chevron-right" size={20} color={C.textLight} /> : null}
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  hero: { alignItems: 'center', paddingBottom: 8, paddingHorizontal: 20 },
  avatar: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { fontSize: 34, fontFamily: FONT.display, color: C.primaryDark },
  avatarEdit: { position: 'absolute', right: -2, bottom: -2, width: 30, height: 30, borderRadius: 15, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.bg },
  name: { fontSize: 28, fontFamily: FONT.display, color: C.text, marginTop: 14 },
  sub: { fontSize: 15, color: C.textSub, marginTop: 2, textAlign: 'center' },
  stats: { flexDirection: 'row', alignSelf: 'stretch', backgroundColor: C.surface, borderRadius: 16, paddingVertical: 14, marginTop: 18 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statV: { fontSize: 24, fontFamily: FONT.display, color: C.text },
  statL: { fontSize: 13, color: C.textSub },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, marginTop: 28, marginBottom: 10 },
  sectionTitle: { fontSize: 20, fontFamily: FONT.display, color: C.text },
  editLink: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.primary },
  card: { backgroundColor: C.surface, marginHorizontal: 16, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4 },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14 },
  itemLbl: { fontSize: 15, color: C.textSub },
  itemVal: { fontSize: 16, color: C.text, textAlign: 'right' },
  inlineInput: { flex: 1, fontSize: 16, color: C.text, textAlign: 'right', padding: 0, fontFamily: FONT.body },
  cropLbl: { fontSize: 13, color: C.textMid },
  hint: { fontSize: 14, color: C.accentDark, paddingBottom: 12 },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  rowTxt: { fontSize: 16, color: C.text },
  rowSub: { fontSize: 14, color: C.textSub, marginTop: 1 },
  sheetLbl: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.textSub, marginBottom: 10 },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  avatarOpt: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: 'transparent' },
  avatarOptOn: { borderColor: C.primary },
  tone: { width: 40, height: 40, borderRadius: 20, borderWidth: 2.5, borderColor: 'transparent' },
  toneOn: { borderColor: C.primary },
  countyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
});
