// Date picker field (Android/iOS native picker), value as YYYY-MM-DD.
import React, { useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Icon, Text } from './ui';
import { locale, useLang, type Lang } from '../lib/i18n';
import { parseDate, toIsoDate } from '../lib/calendar';
import { C } from '../lib/theme';

export function formatDate(iso: string | null | undefined, lang?: Lang): string {
  if (!iso) return '';
  return parseDate(iso).toLocaleDateString(locale(lang), { day: 'numeric', month: 'short', year: 'numeric' });
}

export function DateField({
  value,
  onChange,
  placeholder = 'Choose a date',
  maxDaysAhead = 60,
}: {
  value: string | null;
  onChange: (iso: string | null) => void;
  placeholder?: string;
  maxDaysAhead?: number;
}) {
  const { t, lang } = useLang();
  const [iosOpen, setIosOpen] = useState(false);
  const current = value ? parseDate(value) : new Date();
  const max = new Date(Date.now() + maxDaysAhead * 86400000);
  const min = new Date(Date.now() - 365 * 86400000);

  const handle = (e: DateTimePickerEvent, d?: Date) => {
    setIosOpen(false);
    if (e.type === 'set' && d) onChange(toIsoDate(d));
  };

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: current, mode: 'date', maximumDate: max, minimumDate: min, onChange: handle });
    } else {
      setIosOpen(true);
    }
  };

  return (
    <View>
      <View style={st.row}>
        <TouchableOpacity style={st.field} onPress={open} accessibilityRole="button" accessibilityLabel={t(placeholder)}>
          <Icon name="calendar-month-outline" size={20} color={value ? C.primary : C.textLight} />
          <Text raw style={[st.txt, !value && { color: C.textLight }]}>
            {value ? formatDate(value, lang) : t(placeholder)}
          </Text>
        </TouchableOpacity>
        {value ? (
          <TouchableOpacity style={st.clear} onPress={() => onChange(null)} accessibilityLabel={t('Clear date')}>
            <Icon name="close" size={18} color={C.textSub} />
          </TouchableOpacity>
        ) : null}
      </View>
      {iosOpen ? <DateTimePicker value={current} mode="date" display="inline" maximumDate={max} minimumDate={min} onChange={handle} /> : null}
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  field: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1, borderColor: C.border },
  txt: { fontSize: 15, color: C.text, fontWeight: '600' },
  clear: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
});
