// Profile — a farmer's own page.
// Shows the farmer's name, farm name, fields as small interactive map tiles,
// crops, measurement units, language, reminders, account and privacy.
// Cleanly regrouped into clear sections without clutter.

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, Chip, CropIcon, Icon, Press, Segmented, Sheet, StatusShade, Text, tick } from '../../components/ui';
import { countIncidents, getProfile, listFarms, saveProfile, type Farm, type Profile } from '../../lib/data';
import { COUNTIES, CROP_CHOICES } from '../../lib/counties';
import { signOut, useSession } from '../../lib/session';
import { useLang } from '../../lib/i18n';
import { ensurePermission, notificationsWanted, scheduleFieldReminders, setNotificationsWanted } from '../../lib/notify';
import { calendarFor, fieldTasks, loadTicks } from '../../lib/calendar';
import { hasSwahiliVoice, speak } from '../../lib/speech';
import { deleteSharedFeedback, getTrainingConsent, queuedCount, setTrainingConsent } from '../../lib/feedback';
import { activeModel, checkForModelUpdate, pendingAppUpdate } from '../../lib/modelUpdate';
import type { Active, AppEntry } from '../../lib/modelUpdateCore';
import { cropName } from '../../lib/diseases';
import { fmtArea, setPrefs, usePrefs } from '../../lib/prefs';
import { C, FONT } from '../../lib/theme';
import { MiniFieldBoundary } from '../../components/MiniFieldBoundary';

function Section({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={st.secHead}>
      <Text style={st.secTitle}>{title}</Text>
      {action && onAction ? (
        <TouchableOpacity onPress={onAction} hitSlop={8}>
          <Text style={st.secAction}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function Row({
  icon,
  label,
  sub,
  raw,
  danger,
  onPress,
}: {
  icon: any;
  label: string;
  sub?: string;
  raw?: boolean;
  danger?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <View style={st.row}>
      <View style={[st.rowIcon, danger && { backgroundColor: C.errorTint }]}>
        <Icon name={icon} size={20} color={danger ? C.error : C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text raw={raw} style={[st.rowLabel, danger && { color: C.error }]}>
          {label}
        </Text>
        {sub ? <Text raw={raw} style={st.rowSub}>{sub}</Text> : null}
      </View>
      {onPress ? <Icon name="chevron-right" size={18} color={C.textLight} /> : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { t, lang, setLang } = useLang();
  const prefs = usePrefs();
  const { session, isAnonymous, email } = useSession();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [farms, setFarms] = useState<Farm[] | null>(null); // null while loading: never show "0 fields" before we know
  const [farmsError, setFarmsError] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', county: '', crops: '' });
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [countyPicker, setCountyPicker] = useState(false);
  const [avatarSheet, setAvatarSheet] = useState(false);
  const [farmName, setFarmName] = useState('');
  const [stats, setStats] = useState({ fields: 0, scans: 0, days: 0, acres: 0 });
  const [notify, setNotify] = useState(true);
  const [swVoice, setSwVoice] = useState<boolean | null>(null);
  const [sharing, setSharing] = useState(false);
  const [waiting, setWaiting] = useState(0);
  const [scanner, setScanner] = useState<Active>({ version: 'builtin' });
  const [newApp, setNewApp] = useState<AppEntry | null>(null);
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await getProfile();
      setProfile(p);
      setForm({ name: p.name ?? '', phone: p.phone ?? '', county: p.county ?? '', crops: p.crops ?? '' });
      const since = session?.user.created_at ?? p.created_at;
      setStats((prev) => ({
        ...prev,
        days: since ? Math.max(1, Math.ceil((Date.now() - new Date(since).getTime()) / 86400000)) : prev.days || 1,
      }));
    } catch {
      // offline fallback
    }

    // Separate calls: a failed scan count must not hide the fields.
    try {
      const farmList = await listFarms();
      setFarms(farmList);
      setFarmsError(false);
      setStats((prev) => ({
        ...prev,
        fields: farmList.length,
        acres: farmList.reduce((a, f) => a + (Number(f.size_acres) || 0), 0),
      }));
    } catch {
      setFarmsError(true);
      setFarms((prev) => prev ?? []);
    }
    try {
      const scans = await countIncidents();
      setStats((prev) => ({ ...prev, scans }));
    } catch {
      // offline: keep the last count
    }
  }, [session?.user.created_at]);

  useFocusEffect(
    useCallback(() => {
      load();
      getTrainingConsent().then((c) => setSharing(c === 'yes'));
      queuedCount().then(setWaiting);
      activeModel().then(setScanner);
      pendingAppUpdate().then(setNewApp);
    }, [load])
  );

  const toggleSharing = async (on: boolean) => {
    setSharing(on);
    tick('select');
    await setTrainingConsent(on ? 'yes' : 'no').catch(() => {});
    setWaiting(await queuedCount());
  };

  // "Check for updates" by hand (still Wi-Fi only). A new model is used the next time Tassel opens.
  const checkNow = async () => {
    setChecking(true);
    const r = await checkForModelUpdate(true);
    setChecking(false);
    setNewApp(await pendingAppUpdate());
    const msg: Record<string, string> = {
      skipped: 'Connect to Wi-Fi to check for updates. Updates never use your data bundle.',
      'up-to-date': 'The leaf scanner is up to date.',
      installed: 'A better leaf scanner was downloaded. It starts the next time you open Tassel.',
      'rolled-back': 'The leaf scanner was set back to the built-in model. It starts the next time you open Tassel.',
      'needs-app-update': 'A new leaf scanner needs the new version of the app first.',
      failed: 'Could not check right now. Try again later.',
    };
    Alert.alert(t('Updates'), t(msg[r]));
  };

  const deleteShared = () =>
    Alert.alert(
      t('Delete your shared photos?'),
      t('Every scan photo and answer you sent to Tassel is deleted, and sharing stops. This cannot be undone.'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSharedFeedback();
              setSharing(false);
              setWaiting(0);
              tick('success');
              Alert.alert(t('Deleted'), t('Your shared photos and answers are deleted.'));
            } catch {
              Alert.alert(t('Could not delete'), t('Connect to the internet and try again.'));
            }
          },
        },
      ]
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
      Alert.alert(t('Notifications are off'), t('Allow notifications for Tassel in your phone settings to get reminders.'));
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
        // offline fallback
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
  const version = Constants.expoConfig?.version ?? '2.7.0';
  const since = session?.user.created_at ?? profile?.created_at;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={[]}
        renderItem={null}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 56 }}
        ListHeaderComponent={
          <>
            {/* 1. Identity Hero */}
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
                  (isAnonymous ? t('Guest — data linked to this phone') : email)}
              </Text>

              {/* 4 Clean Metrics */}
              <View style={st.stats}>
                {[
                  { v: farms === null ? '–' : String(stats.fields), l: t('fields') },
                  { v: farms === null ? '–' : stats.acres ? (prefs.units === 'hectares' ? (stats.acres * 0.4047).toFixed(1) : stats.acres.toFixed(1)) : '0', l: t(prefs.units === 'hectares' ? 'hectares' : 'acres') },
                  { v: String(stats.scans), l: t('scans') },
                  { v: String(stats.days), l: t('days') },
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

            {/* A newer app: say so once, plainly, with the size (it is a big download) */}
            {newApp ? (
              <Card style={{ marginHorizontal: 16, marginTop: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Icon name="cellphone-arrow-down" size={28} color={C.primary} />
                  <View style={{ flex: 1 }}>
                    <Text raw style={st.rowTxt}>{t('Tassel {v} is ready', { v: newApp.version })}</Text>
                    <Text raw style={st.rowSub}>
                      {(lang === 'sw' ? newApp.notes?.sw : newApp.notes?.en) ??
                        (newApp.bytes ? t('{mb} MB. Download it on Wi-Fi.', { mb: Math.round(newApp.bytes / 1048576) }) : t('Download it on Wi-Fi.'))}
                    </Text>
                  </View>
                </View>
                <Btn label="Get the new version" icon="download" style={{ marginTop: 12 }} onPress={() => Linking.openURL(newApp.url)} />
              </Card>
            ) : null}

            {/* 2. My Fields as Small Map Tiles (P2 Requirement) */}
            <Section
              title={farms === null ? t('My fields') : t('My fields ({n})', { n: farms.length })}
              action={t('+ Add field')}
              onAction={() => router.push('/add-farm')}
            />
            {farms === null ? (
              <Card style={{ marginHorizontal: 16 }}>
                <ActivityIndicator color={C.primary} style={{ paddingVertical: 28 }} accessibilityLabel={t('Loading')} />
              </Card>
            ) : farmsError && farms.length === 0 ? (
              <Card style={{ marginHorizontal: 16 }}>
                <View style={{ alignItems: 'center', gap: 8, paddingVertical: 12 }}>
                  <Icon name="wifi-off" size={28} color={C.textSub} />
                  <Text style={st.itemLbl}>Could not load your fields.</Text>
                  <Btn label="Try again" kind="secondary" icon="refresh" onPress={load} />
                </View>
              </Card>
            ) : farms.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingVertical: 4 }}
              >
                {farms.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={st.fieldTile}
                    onPress={() => router.push({ pathname: '/farm/[id]', params: { id: f.id } })}
                    activeOpacity={0.85}
                  >
                    <MiniFieldBoundary
                      polygon={f.polygon}
                      tone="normal"
                      width={140}
                      height={82}
                    />
                    <View style={st.fieldTileMeta}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {f.crop ? <CropIcon crop={f.crop} size={20} disc={false} /> : null}
                        <Text raw style={st.fieldTileName} numberOfLines={1}>
                          {f.name}
                        </Text>
                      </View>
                      <Text raw style={st.fieldTileSub}>
                        {[f.size_acres ? fmtArea(Number(f.size_acres), prefs.units) : null, f.crop ? cropName(f.crop) : null].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Card style={{ marginHorizontal: 16 }}>
                <View style={{ alignItems: 'center', gap: 8, paddingVertical: 12 }}>
                  <Icon name="map-marker-plus-outline" size={32} color={C.primary} />
                  <Text style={st.itemLbl}>{t('No fields added yet')}</Text>
                  <Btn label="Draw your field from space" icon="satellite-variant" onPress={() => router.push('/add-farm')} />
                </View>
              </Card>
            )}

            {/* 3. Farm Settings */}
            <Section title={t('Farm settings')} action={edit ? (saving ? t('Saving…') : t('Save')) : t('Edit')} onAction={() => (edit ? save() : setEdit(true))} />
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
                    {CROP_CHOICES.slice(0, 12).map((c) => (
                      <Chip key={c} crop={c} label={cropName(c)} raw active={crops.includes(c)} onPress={() => toggleCrop(c)} />
                    ))}
                  </View>
                ) : crops.length ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    {crops.map((c) => (
                      <View key={c} style={{ alignItems: 'center', gap: 4, width: 56 }}>
                        <CropIcon crop={c} size={42} />
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

              {edit ? (
                <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 10 }}>
                  <Btn label="Cancel" kind="secondary" onPress={() => { setEdit(false); load(); }} style={{ flex: 1 }} />
                  <Btn label="Save" loading={saving} onPress={() => save()} style={{ flex: 1 }} />
                </View>
              ) : null}
            </View>

            {/* 4. Language & Audio */}
            <Section title={t('Language / Lugha')} />
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
                sub={lang === 'sw' ? (swVoice ? t('Kiswahili voice installed') : t('Standard voice')) : undefined}
                onPress={() => speak(t('Welcome to Tassel. Scan a leaf to check your crop.'), { lang })}
              />
            </View>

            {/* 5. Alerts and Reminders */}
            <Section title={t('Alerts and reminders')} />
            <View style={st.card}>
              <View style={st.rowItem}>
                <Icon name="bell-outline" size={22} color={C.text} />
                <View style={{ flex: 1 }}>
                  <Text style={st.rowTxt}>Notifications</Text>
                  <Text style={st.rowSub}>Calendar tasks, field changes from space and outbreak warnings</Text>
                </View>
                <Switch value={notify} onValueChange={toggleNotify} trackColor={{ true: C.secondary, false: C.sunken }} thumbColor={notify ? C.primary : '#FFFFFF'} />
              </View>
              <Row icon="calendar-check-outline" label="Crop calendar" onPress={() => router.push('/calendar')} />
              <Row icon="map-marker-radius-outline" label="Outbreak alerts" onPress={() => router.push('/outbreaks')} />
            </View>

            {/* 6. Account & Security */}
            <Section title={t('Account')} />
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

            {/* 7. Resources & Privacy */}
            <Section title={t('Resources')} />
            <View style={st.card}>
              <Row icon="spray" label="Pesticide calculator & PCPB" onPress={() => router.push('/pesticide-calc')} />
              <Row icon="flask-outline" label="How Tassel works (methodology)" onPress={() => router.push('/methodology')} />
              <Row icon="shield-check-outline" label="Check pesticide registrations (pcpb.go.ke)" onPress={() => Linking.openURL('https://www.pcpb.go.ke')} />
              <Row
                icon="shield-lock-outline"
                label="Privacy guarantee"
                sub="Leaf photos stay on your phone unless you share them. No ads."
                onPress={() =>
                  Alert.alert(
                    t('Your privacy'),
                    t(
                      'Leaf photos are analysed completely on this phone and are never uploaded unless you attach one to a community post, choose the AI check, or turn on Share scan photos. Shared photos have their location removed, send only on Wi-Fi, and are seen only by the Tassel team; you can delete them here at any time. Your fields, saved scans and price reports are securely stored in your private account. Outbreaks and market prices only share anonymous county totals. Zero advertising. We never sell your data.'
                    )
                  )
                }
              />
              <View style={st.rowItem}>
                <Icon name="image-outline" size={22} color={C.text} />
                <View style={{ flex: 1 }}>
                  <Text style={st.rowTxt}>Share scan photos</Text>
                  <Text raw style={st.rowSub}>
                    {sharing
                      ? waiting
                        ? t('{n} waiting for Wi-Fi', { n: waiting })
                        : t('On. Sent only on Wi-Fi, without location.')
                      : t('Off. Photos stay on this phone.')}
                  </Text>
                </View>
                <Switch value={sharing} onValueChange={toggleSharing} trackColor={{ true: C.secondary, false: C.sunken }} thumbColor={sharing ? C.primary : '#FFFFFF'} />
              </View>
              <Row icon="delete-outline" label="Delete photos I shared" danger onPress={deleteShared} />
              <Row icon="information-outline" label="App version" sub={`v${version} · KSEF 2027`} />
              <Row
                icon="leaf"
                label={t(checking ? 'Checking…' : 'Leaf scanner')}
                sub={
                  scanner.version === 'builtin'
                    ? t('Built-in model v5. Tap to check for a better one.')
                    : t('Model {v}, updated {date}. Tap to check again.', {
                        v: scanner.version,
                        date: scanner.installed_at ? new Date(scanner.installed_at).toLocaleDateString() : '',
                      })
                }
                raw
                onPress={checking ? undefined : checkNow}
              />
            </View>
          </>
        }
      />

      <StatusShade />

      {/* Avatar picker sheet */}
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
          {['Maize', 'Potato', 'Tomato', 'Beans', 'Wheat', 'Kale', 'Cabbage', 'Avocado', 'Banana', 'Onion'].map((c) => (
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
        <Btn label="Done" onPress={() => setAvatarSheet(false)} style={{ marginTop: 18 }} />
      </Sheet>

      {/* County picker sheet */}
      <Sheet visible={countyPicker} onClose={() => setCountyPicker(false)} title="Choose your county">
        <ScrollView style={{ maxHeight: 380 }}>
          {COUNTIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[st.countyOpt, form.county === c && st.countyOptOn]}
              onPress={() => {
                tick('select');
                setForm({ ...form, county: c });
                setCountyPicker(false);
              }}
            >
              <Text raw style={[st.countyTxt, form.county === c && { color: C.primary, fontFamily: FONT.bodyBold }]}>
                {c}
              </Text>
              {form.county === c ? <Icon name="check" size={20} color={C.primary} /> : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Sheet>
    </View>
  );
}

const st = StyleSheet.create({
  hero: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  avatar: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { fontSize: 32, fontFamily: FONT.display, color: '#FFFFFF' },
  avatarEdit: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: { fontSize: 24, fontFamily: FONT.display, color: C.text, marginTop: 12 },
  sub: { fontSize: 14, color: C.textSub, marginTop: 2, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: 10, marginTop: 18, width: '100%' },
  stat: { flex: 1, backgroundColor: C.surface, borderRadius: 14, padding: 12, alignItems: 'center', gap: 2 },
  statV: { fontSize: 20, fontFamily: FONT.display, color: C.text },
  statL: { fontSize: 13, color: C.textSub },

  // My fields tiles
  fieldTile: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 8,
    width: 156,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  fieldTileMeta: { paddingHorizontal: 4, paddingBottom: 4 },
  fieldTileName: { fontSize: 14, fontFamily: FONT.bodyBold, color: C.text },
  fieldTileSub: { fontSize: 12, color: C.textSub, marginTop: 2 },

  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, marginTop: 24, marginBottom: 8 },
  secTitle: { fontSize: 17, fontFamily: FONT.bodyBold, color: C.text },
  secAction: { fontSize: 14, fontFamily: FONT.bodyBold, color: C.primary },
  card: { backgroundColor: C.surface, borderRadius: 16, marginHorizontal: 16, paddingHorizontal: 16, paddingVertical: 4 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.sunken },
  itemLbl: { fontSize: 15, fontFamily: FONT.body, color: C.text },
  itemVal: { fontSize: 15, color: C.textMid },
  inlineInput: { fontSize: 15, color: C.text, textAlign: 'right', minWidth: 140 },
  cropLbl: { fontSize: 11, color: C.textSub, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primaryTint, justifyContent: 'center', alignItems: 'center' },
  rowLabel: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.text },
  rowSub: { fontSize: 12, color: C.textSub, marginTop: 1 },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowTxt: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.text },
  sheetLbl: { fontSize: 14, fontFamily: FONT.bodyBold, color: C.textSub, marginBottom: 10 },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  avatarOpt: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  avatarOptOn: { borderColor: C.primary },
  countyOpt: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: C.sunken },
  countyOptOn: { backgroundColor: C.primaryTint },
  countyTxt: { fontSize: 16, color: C.text },
});
