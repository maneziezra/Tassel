// Add field — Slide Wizard (P1 Redesign).
//
// A calm, full-screen, one-question-per-slide flow:
// 1. Draw boundary from space (or enter size manually)
// 2. Name your field (pre-filled smart default)
// 3. Choose your crop (flat SVG CropIcon visual grid, no typing)
// 4. Planting date ("Today", "Last week", or pick a date)
// 5. Size (pre-filled from drawing or quick stepper)
// 6. Celebration screen & immediate Sentinel-2 satellite check trigger.

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
import { addFarm, listFarms, type LatLng } from '../lib/data';
import { CROP_CHOICES } from '../lib/counties';
import { centroid } from '../lib/geo';
import { calendarFor, fieldTasks } from '../lib/calendar';
import { ensurePermission, scheduleFieldReminders } from '../lib/notify';
import { refreshSatellite } from '../lib/satellite';
import { cropName } from '../lib/diseases';
import { useLang } from '../lib/i18n';
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

  const totalSteps = 5;
  const progress = Math.min(1, Math.max(0.1, (step + 1) / totalSteps));

  const nextStep = () => {
    tick('select');
    if (step === 1 && !name.trim()) {
      Alert.alert(t('Name needed'), t('Give the field a name, e.g. "Shamba la juu".'));
      return;
    }
    if (step < 4) {
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
          <View style={{ width: `${progress * 100}%`, height: 3, backgroundColor: C.primary }} />
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── SLIDE 0: DRAW FROM SPACE ───────────────────────────────── */}
        {step === 0 && (
          <View style={st.slideWrapper}>
            <View style={{ alignItems: 'center', marginTop: 10 }}>
              <SatellitePassArt size={110} />
            </View>

            <View style={{ gap: 8, alignItems: 'center', marginTop: 16 }}>
              <Text style={st.slideTitle}>Draw your field from space</Text>
              <Text style={st.slideSub}>
                Tap corners on the satellite map to measure your exact acreage and track crop health every 2–3 days.
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
                Give this plot a name so you can recognise it on your home screen and satellite passes.
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
                Pick the primary crop growing in this plot. Tassel configures your crop calendar and diagnosis for it.
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
                    }}
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
                This powers your week-by-week calendar with weeding, top-dressing and spray windows.
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
            <Btn label="Next" onPress={nextStep} style={{ minHeight: 54, marginTop: 30 }} />
          </View>
        )}

        {/* ── SLIDE 4: SIZE ──────────────────────────────────────────── */}
        {step === 4 && (
          <View style={st.slideWrapper}>
            <View style={{ gap: 6 }}>
              <Text style={st.slideTitle}>How big is this field?</Text>
              <Text style={st.slideSub}>
                Used to calculate fertiliser bags, pesticide spray quantities, and yield targets.
              </Text>
            </View>

            {polygon ? (
              <View style={st.measuredBox}>
                <Icon name="check-circle" size={24} color={C.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={st.measuredTitle}>Measured from space</Text>
                  <Text raw style={st.measuredValue}>
                    {t('Boundary drawn · {n} acres', { n: Number(size).toFixed(2) })}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Stepper & input */}
            <View style={st.stepperContainer}>
              <TouchableOpacity
                onPress={() => {
                  tick('select');
                  const cur = Math.max(0.25, Number(size || 1) - 0.5);
                  setSize(cur.toFixed(2));
                }}
                style={st.stepperBtn}
              >
                <Icon name="minus" size={24} color={C.primaryDark} />
              </TouchableOpacity>

              <View style={{ alignItems: 'center', minWidth: 100 }}>
                <TextInput
                  style={st.stepperValueText}
                  value={size}
                  onChangeText={setSize}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
                <Text style={st.stepperUnitText}>acres</Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  tick('select');
                  const cur = Number(size || 1) + 0.5;
                  setSize(cur.toFixed(2));
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
                {['0.5', '1.0', '1.5', '2.0', '3.0', '5.0'].map((val) => (
                  <TouchableOpacity
                    key={val}
                    onPress={() => {
                      tick('select');
                      setSize(val);
                    }}
                    style={[st.sugChip, size === val && st.sugChipActive]}
                  >
                    <Text raw style={[st.sugChipText, size === val && st.sugChipTextActive]}>
                      {`${val} acres`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ flex: 1 }} />
            <Btn
              label="Confirm planting"
              icon="check-circle-outline"
              loading={saving}
              onPress={nextStep}
              style={{ minHeight: 54, marginTop: 30 }}
            />
          </View>
        )}

        {/* ── SLIDE 5: CELEBRATION / DONE ───────────────────────────── */}
        {step === 5 && (
          <View style={[st.slideWrapper, { alignItems: 'center', justifyContent: 'center', gap: 16 }]}>
            <View style={st.celebrationIconWrap}>
              <Icon name="check-bold" size={44} color="#FFFFFF" />
            </View>

            <Text style={st.celebrationTitle}>Field added to your farm!</Text>
            <Text style={st.celebrationSub}>
              Tassel is checking Sentinel-2 images from space… about a minute.
            </Text>

            <View style={st.fieldSummaryCard}>
              <CropIcon crop={crop} size={48} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text raw style={st.summaryName}>{name}</Text>
                <Text raw style={st.summaryDetails}>
                  {[cropName(crop), `${size} acres`].filter(Boolean).join(' · ')}
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
  celebrationIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.primary,
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
