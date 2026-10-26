// Add field — Slide Wizard (P1 Redesign).
//
// A calm, full-screen, one-question-per-slide flow:
// 1. Draw boundary from space (or enter size manually)
// 2. Name your field (pre-filled smart default)
// 3. Choose your crop (flat SVG CropIcon visual grid, no typing)
// 4. Planting date ("Today", "Last week", or pick a date)
// 5. Size: skipped when the drawing measured it; a stepper in the farmer's units otherwise
// 6. Done: the new field's outline draws itself under the satellite sweep while the
//    first Sentinel-2 check runs (the same art as the Home hero).
// Slides slide in, the progress line moves, and choosing a crop or a date moves on by itself.

import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInRight, FadeOutLeft, useAnimatedStyle, useSharedValue, withTiming, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';
import {
  Btn,
  CropIcon,
  Icon,
  Press,
  ProgressBar,
  SatellitePassArt,
  StatusShade,
  Text,
  tick,
} from '../components/ui';
import { DateField } from '../components/DateField';
import { FieldHero } from '../components/FieldHero';
import { NotoEmoji } from '../components/NotoEmoji';
import { addFarm, listFarms, type LatLng } from '../lib/data';
import { CROP_CHOICES } from '../lib/counties';
import { centroid } from '../lib/geo';
import { calendarFor, fieldTasks } from '../lib/calendar';
import { ensurePermission, scheduleFieldReminders } from '../lib/notify';
import { refreshSatellite } from '../lib/satellite';
import { cropName } from '../lib/diseases';
import { useLang } from '../lib/i18n';
import { fmtArea, fromAcres, toAcres, usePrefs } from '../lib/prefs';
import { C, FONT, RADIUS } from '../lib/theme';

const SUGGESTED_NAMES = ['Home Plot', 'Upper Field', 'River Plot', 'Main Shamba'];

const DATE_SHORTCUTS = [
  { label: 'Today', days: 0 },
  { label: '1 week ago', days: 7 },
  { label: '2 weeks ago', days: 14 },
  { label: '3 weeks ago', days: 21 },
  { label: '1 month ago', days: 30 },
];

export default function AddFarmScreen() {
  const insets = useSafeAreaInsets();
  const { t, lang } = useLang();
  const { units } = usePrefs();
  const params = useLocalSearchParams<{ polygon?: string; acres?: string }>();

  const polygon: LatLng[] | null = (() => {
    try {
      return params.polygon ? JSON.parse(params.polygon) : null;
    } catch {
      return null;
    }
  })();

  const initialAcres = params.acres ? Number(params.acres).toFixed(2) : '1.0';

  // State
  const [step, setStep] = useState(polygon ? 1 : 0); // 0: Draw, 1: Name, 2: Crop, 3: Date, 4: Size, 5: Done
  const [name, setName] = useState('');
  const [crop, setCrop] = useState('Maize');
  const [planted, setPlanted] = useState<string | null>(new Date().toISOString().slice(0, 10));
  const [remind, setRemind] = useState(true);
  const [size, setSize] = useState(initialAcres);
  const [saving, setSaving] = useState(false);
  const [savedFarmId, setSavedFarmId] = useState<string | null>(null);

  // Pre-fill default name based on existing count
  useEffect(() => {
    listFarms()
      .then((existing) => {
        if (!name) {
          const num = existing.length + 1;
          setName(`Shamba ${num}`);
        }
      })
      .catch(() => {
        if (!name) setName('My Shamba');
      });
  }, []);

  // With a drawn boundary the size is already measured, so that slide is skipped.
  const totalSteps = polygon ? 4 : 5;
  const progressValue = useSharedValue(0);
  useEffect(() => {
    progressValue.value = withTiming(Math.min(1, (step + 1) / totalSteps), { duration: 420 });
  }, [step, totalSteps, progressValue]);
  const progressStyle = useAnimatedStyle(() => ({ width: `${progressValue.value * 100}%` }));

  const nextStep = () => {
    tick('select');
    if (step === 1 && !name.trim()) {
      Alert.alert(t('Name needed'), t('Give the field a name, e.g. "Shamba la juu".'));
      return;
    }
    if (step === 3 && polygon) {
      saveField();
    } else if (step < 4) {
      setStep(step + 1);
    } else if (step === 4) {
      saveField();
    }
  };

  const prevStep = () => {
    tick('light');
    if (step > 0) setStep(step - 1);
    else router.back();
  };

  const saveField = async () => {
    const acres = size ? Number(size.replace(',', '.')) : null;
    setSaving(true);
    try {
      const gps = polygon ? centroid(polygon) : null;
      const farm = await addFarm({
        name: name.trim() || 'My Shamba',
        crop: crop.trim() || null,
        size_acres: acres,
        polygon,
        center_lat: gps?.lat ?? null,
        center_lng: gps?.lng ?? null,
        ...(planted ? { planting_date: planted } : {}),
      });

      setSavedFarmId(farm.id);

      // Trigger reminders
      const cal = calendarFor(crop);
      if (planted && cal && remind && (await ensurePermission())) {
        scheduleFieldReminders(farm.id, fieldTasks(farm, [], lang)).catch(() => {});
      }

      // Automatically trigger satellite check in background
      if (farm.id) {
        refreshSatellite(farm.id).catch(() => {});
      }

      tick('success');
      setStep(5); // Go to celebration slide
    } catch (e) {
      Alert.alert(t('Could not save'), e instanceof Error ? e.message : '');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusShade color={C.surface} />

      {/* ── TOP NAV & PROGRESS ───────────────────────────────────────── */}
      <View style={[st.topNav, { paddingTop: insets.top + 10 }]}>
        {step < 5 ? (
          <TouchableOpacity onPress={prevStep} hitSlop={10} style={st.navBtn}>
            <Icon name="chevron-left" size={28} color={C.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 28 }} />
        )}

        <View style={{ flex: 1, alignItems: 'center' }}>
          {step < 5 ? (
            <Text style={st.stepCounter}>
              {t('Step {a} of {b}', { a: step + 1, b: totalSteps })}
            </Text>
          ) : (
            <Text style={st.stepCounter}>{t('Planting calendar ready!')}</Text>
          )}
        </View>

        {step < 5 ? (
          <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={st.navBtn}>
            <Icon name="close" size={24} color={C.textLight} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 28 }} />
        )}
      </View>

      {/* Progress line */}
      {step < 5 ? (
        <View style={{ height: 3, backgroundColor: C.sunken }}>
          <Animated.View style={[{ height: 3, backgroundColor: C.primary }, progressStyle]} />
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View key={step} entering={FadeInRight.duration(280)} exiting={FadeOutLeft.duration(160)} style={{ flex: 1 }}>
        {/* ── SLIDE 0: DRAW FROM SPACE ───────────────────────────────── */}
        {step === 0 && (
          <View style={st.slideWrapper}>
            <View style={{ alignItems: 'center', marginTop: 10 }}>
              <SatellitePassArt size={110} />
            </View>

            <View style={{ gap: 8, alignItems: 'center', marginTop: 16 }}>
              <Text style={st.slideTitle}>Draw your field from space</Text>
              <Text style={st.slideSub}>
                Tap the corners on the satellite map. Tassel measures it and watches its health from space.
              </Text>
            </View>

            <View style={{ gap: 12, marginTop: 32 }}>
              <Btn
                label="Draw boundary on map"
                icon="vector-polygon"
                onPress={() => router.replace('/farm-map')}
                style={{ minHeight: 54 }}
              />

              <Btn
                label="Enter size manually"
                kind="ghost"
                onPress={() => {
                  tick('select');
                  setStep(1);
                }}
              />
            </View>
          </View>
        )}

        {/* ── SLIDE 1: NAME YOUR FIELD ───────────────────────────────── */}
        {step === 1 && (
          <View style={st.slideWrapper}>
            <View style={{ gap: 6 }}>
              <Text style={st.slideTitle}>Name your field</Text>
              <Text style={st.slideSub}>
                We picked one for you. Change it if you like.
              </Text>
            </View>

            <View style={{ marginTop: 24 }}>
              <TextInput
                style={st.bigInput}
                value={name}
                onChangeText={setName}
                placeholder={t("e.g. Muthoni's tomato plot")}
                placeholderTextColor={C.textLight}
                maxLength={60}
                autoFocus
                selectTextOnFocus
              />
            </View>

            <View style={{ marginTop: 20, gap: 10 }}>
              <Text style={st.chipGroupLabel}>Suggested names</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {SUGGESTED_NAMES.map((sug) => (
                  <TouchableOpacity
                    key={sug}
                    onPress={() => {
                      tick('select');
                      setName(t(sug));
                    }}
                    style={[st.sugChip, name === t(sug) && st.sugChipActive]}
                  >
                    <Text raw style={[st.sugChipText, name === t(sug) && st.sugChipTextActive]}>
                      {t(sug)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ flex: 1 }} />
            <Btn label="Next" onPress={nextStep} style={{ minHeight: 54, marginTop: 30 }} />
          </View>
        )}

        {/* ── SLIDE 2: CHOOSE YOUR CROP ──────────────────────────────── */}
        {step === 2 && (
          <View style={st.slideWrapper}>
            <View style={{ gap: 6 }}>
              <Text style={st.slideTitle}>Choose your crop</Text>
              <Text style={st.slideSub}>
                Tap the crop growing here.
              </Text>
            </View>

            <View style={st.cropGrid}>
              {CROP_CHOICES.slice(0, 15).map((c) => {
                const isSelected = crop === c;
                return (
                  <Press
                    key={c}
                    onPress={() => {
                      tick('select');
                      setCrop(c);
                      setTimeout(() => setStep(3), 220);
                    }}
                    accessibilityState={{ selected: isSelected }}
                    style={[st.cropCard, isSelected && st.cropCardSelected]}
                  >
                    <CropIcon crop={c} size={48} disc={false} />
                    <Text raw style={[st.cropCardText, isSelected && st.cropCardTextSelected]}>
                      {cropName(c)}
                    </Text>
                  </Press>
                );
              })}
            </View>

            <Btn label="Next" onPress={nextStep} style={{ minHeight: 54, marginTop: 20 }} />
          </View>
        )}

        {/* ── SLIDE 3: PLANTING DATE ─────────────────────────────────── */}
        {step === 3 && (
          <View style={st.slideWrapper}>
            <View style={{ gap: 6 }}>
              <Text style={st.slideTitle}>When did you plant?</Text>
              <Text style={st.slideSub}>
                Tassel plans weeding, top-dressing and scouting from this date.
              </Text>
            </View>

            <View style={{ marginTop: 20, gap: 10 }}>
              <Text style={st.chipGroupLabel}>Quick choices</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {DATE_SHORTCUTS.map((item) => {
                  const d = new Date(Date.now() - item.days * 86400000).toISOString().slice(0, 10);
                  const isSelected = planted === d;
                  return (
                    <TouchableOpacity
                      key={item.label}
                      onPress={() => {
                        tick('select');
                        setPlanted(d);
                        setTimeout(nextStep, 220);
                      }}
                      style={[st.sugChip, isSelected && st.sugChipActive]}
                    >
                      <Text style={[st.sugChipText, isSelected && st.sugChipTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  onPress={() => {
                    tick('select');
                    setPlanted(null);
                  }}
                  style={[st.sugChip, planted === null && st.sugChipActive]}
                >
                  <Text style={[st.sugChipText, planted === null && st.sugChipTextActive]}>
                    Not planted yet
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginTop: 24, gap: 8 }}>
              <Text style={st.chipGroupLabel}>Or pick a specific date</Text>
              <DateField value={planted} onChange={setPlanted} placeholder="Choose another date" />
            </View>

            {planted ? (
              <TouchableOpacity
                style={st.remindRow}
                onPress={() => setRemind(!remind)}
                hitSlop={8}
              >
                <Icon
                  name={remind ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={24}
                  color={C.primary}
                />
                <Text style={st.remindText}>
                  Remind me of season tasks (weeding, fertilising, scouting)
                </Text>
              </TouchableOpacity>
            ) : null}

            <View style={{ flex: 1 }} />
            <Btn label={polygon ? 'Save field' : 'Next'} loading={saving} onPress={nextStep} style={{ minHeight: 56, marginTop: 30 }} />
          </View>
        )}

        {/* ── SLIDE 4: SIZE ──────────────────────────────────────────── */}
        {step === 4 && (
          <View style={st.slideWrapper}>
            <View style={{ gap: 6 }}>
              <Text style={st.slideTitle}>How big is this field?</Text>
              <Text style={st.slideSub}>
                For fertiliser bags and spray amounts.
              </Text>
            </View>

            {polygon ? (
              <View style={st.measuredBox}>
                <Icon name="check-circle" size={24} color={C.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={st.measuredTitle}>Measured from space</Text>
                  <Text raw style={st.measuredValue}>
                    {fmtArea(Number(size), units)}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Stepper & input */}
            <View style={st.stepperContainer}>
              <TouchableOpacity
                onPress={() => {
                  tick('select');
                  const step = units === 'hectares' ? 0.25 : 0.5;
                  const cur = Math.max(step, fromAcres(Number(size || 1), units) - step);
                  setSize(toAcres(cur, units).toFixed(3));
                }}
                style={st.stepperBtn}
              >
                <Icon name="minus" size={24} color={C.primaryDark} />
              </TouchableOpacity>

              <View style={{ alignItems: 'center', minWidth: 100 }}>
                <TextInput
                  style={st.stepperValueText}
                  value={String(Number(fromAcres(Number(size || 0), units).toFixed(2)))}
                  onChangeText={(v) => {
                    const n = Number(v.replace(',', '.'));
                    if (!Number.isNaN(n)) setSize(toAcres(n, units).toFixed(3));
                  }}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  accessibilityLabel={t('Field size')}
                />
                <Text style={st.stepperUnitText}>{units === 'hectares' ? 'hectares' : 'acres'}</Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  tick('select');
                  const step = units === 'hectares' ? 0.25 : 0.5;
                  const cur = fromAcres(Number(size || 1), units) + step;
                  setSize(toAcres(cur, units).toFixed(3));
                }}
                style={st.stepperBtn}
              >
                <Icon name="plus" size={24} color={C.primaryDark} />
              </TouchableOpacity>
            </View>

            {/* Quick size chips */}
            <View style={{ marginTop: 24, gap: 10 }}>
              <Text style={st.chipGroupLabel}>Quick sizes</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(units === 'hectares' ? [0.25, 0.5, 1, 2] : [0.5, 1, 2, 3, 5]).map((val) => {
                  const acres = toAcres(val, units).toFixed(3);
                  const on = Math.abs(Number(size) - Number(acres)) < 0.001;
                  return (
                    <TouchableOpacity
                      key={val}
                      onPress={() => {
                        tick('select');
                        setSize(acres);
                      }}
                      style={[st.sugChip, on && st.sugChipActive]}
                    >
                      <Text raw style={[st.sugChipText, on && st.sugChipTextActive]}>
                        {fmtArea(Number(acres), units)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={{ flex: 1 }} />
            <Btn label="Save field" icon="check-circle-outline" loading={saving} onPress={nextStep} style={{ minHeight: 56, marginTop: 30 }} />
          </View>
        )}

        {/* ── SLIDE 5: CELEBRATION / DONE ───────────────────────────── */}
        {step === 5 && (
          <View style={[st.slideWrapper, { alignItems: 'center', justifyContent: 'center', gap: 16 }]}>
            {polygon ? (
              <View style={st.doneArt}>
                <FieldHero polygon={polygon} grid={null} width={300} height={190} checking playKey={savedFarmId ?? 'new'} />
              </View>
            ) : (
              <Animated.View entering={ZoomIn.springify().damping(12)} style={st.celebrationIconWrap}>
                <NotoEmoji name="plant" size={80} />
              </Animated.View>
            )}

            <Text raw style={st.celebrationTitle}>{t('{name} is on your farm', { name })}</Text>
            <Text style={st.celebrationSub}>
              {polygon ? 'Checking your field from space… about a minute' : 'Draw it on the map later to see it from space.'}
            </Text>

            <View style={st.fieldSummaryCard}>
              <CropIcon crop={crop} size={48} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text raw style={st.summaryName}>{name}</Text>
                <Text raw style={st.summaryDetails}>
                  {[cropName(crop), size ? fmtArea(Number(size), units) : null].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </View>

            <Btn
              label="View on Home"
              onPress={() => {
                tick('select');
                router.replace('/(tabs)');
              }}
              style={{ minHeight: 54, alignSelf: 'stretch', marginTop: 24 }}
            />
          </View>
        )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: C.surface,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCounter: {
    fontSize: 14,
    fontFamily: FONT.bodyBold,
    color: C.textMid,
  },
  slideWrapper: {
    flex: 1,
    paddingTop: 10,
  },
  slideTitle: {
    fontSize: 26,
    fontFamily: FONT.display,
    color: C.text,
    lineHeight: 32,
  },
  slideSub: {
    fontSize: 15,
    fontFamily: FONT.body,
    color: C.textSub,
    lineHeight: 22,
  },
  bigInput: {
    backgroundColor: C.surface,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 18,
    fontFamily: FONT.bodyBold,
    color: C.text,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  chipGroupLabel: {
    fontSize: 13,
    fontFamily: FONT.bodyBold,
    color: C.textMid,
  },
  sugChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  sugChipActive: {
    backgroundColor: C.primaryTint,
    borderColor: C.primary,
  },
  sugChipText: {
    fontSize: 14,
    color: C.textMid,
    fontFamily: FONT.body,
  },
  sugChipTextActive: {
    color: C.primaryDark,
    fontFamily: FONT.bodyBold,
  },
  cropGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  cropCard: {
    width: '31%',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cropCardSelected: {
    backgroundColor: C.primaryTint,
    borderColor: C.primary,
  },
  cropCardText: {
    fontSize: 13,
    color: C.text,
    fontFamily: FONT.body,
    textAlign: 'center',
  },
  cropCardTextSelected: {
    fontFamily: FONT.bodyBold,
    color: C.primaryDark,
  },
  remindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    backgroundColor: C.surface,
    padding: 14,
    borderRadius: 14,
  },
  remindText: {
    flex: 1,
    fontSize: 14,
    color: C.textMid,
    lineHeight: 19,
  },
  measuredBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.primaryTint,
    padding: 14,
    borderRadius: 14,
    marginTop: 16,
  },
  measuredTitle: {
    fontSize: 12,
    color: C.primaryDark,
    fontFamily: FONT.bodyBold,
  },
  measuredValue: {
    fontSize: 15,
    color: C.text,
    fontFamily: FONT.bodyBold,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 30,
    backgroundColor: C.surface,
    paddingVertical: 18,
    borderRadius: 20,
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueText: {
    fontSize: 34,
    fontFamily: FONT.display,
    color: C.text,
    textAlign: 'center',
  },
  stepperUnitText: {
    fontSize: 14,
    color: C.textSub,
    textAlign: 'center',
  },
  doneArt: { width: 320, height: 210, borderRadius: 20, backgroundColor: C.brandDark, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  celebrationIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: C.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  celebrationTitle: {
    fontSize: 26,
    fontFamily: FONT.display,
    color: C.text,
    textAlign: 'center',
  },
  celebrationSub: {
    fontSize: 15,
    fontFamily: FONT.body,
    color: C.textSub,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  fieldSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.surface,
    padding: 16,
    borderRadius: 16,
    alignSelf: 'stretch',
    marginTop: 14,
  },
  summaryName: {
    fontSize: 17,
    fontFamily: FONT.bodyBold,
    color: C.text,
  },
  summaryDetails: {
    fontSize: 14,
    color: C.textSub,
  },
});
