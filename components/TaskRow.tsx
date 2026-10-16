// One crop-calendar task with its date window, status and a tick box.
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon, Text } from './ui';
import { locale, useLang } from '../lib/i18n';
import type { FieldTask, TaskStatus } from '../lib/calendar';
import { C } from '../lib/theme';

const STATUS: Record<TaskStatus, { label: string; color: string; tint: string }> = {
  done: { label: 'Done', color: C.primary, tint: C.primaryTint },
  now: { label: 'Do it now', color: C.warn, tint: C.warnTint },
  soon: { label: 'This week', color: C.accent, tint: C.accentTint },
  later: { label: 'Coming up', color: C.textSub, tint: C.bg },
  missed: { label: 'Missed', color: C.error, tint: C.errorTint },
};

export function TaskRow({ item, onToggle, showField }: { item: FieldTask; onToggle: () => void; showField?: boolean }) {
  const { t, lang } = useLang();
  const s = STATUS[item.status];
  const fmt = (d: Date) => d.toLocaleDateString(locale(lang), { day: 'numeric', month: 'short' });
  const when = item.task.start === item.task.end ? fmt(item.startDate) : `${fmt(item.startDate)} – ${fmt(item.endDate)}`;
  return (
    <View style={[st.row, item.status === 'now' && { borderColor: C.warn, backgroundColor: '#FFFDF7' }]}>
      <TouchableOpacity onPress={onToggle} accessibilityRole="checkbox" accessibilityState={{ checked: item.ticked }} style={st.tick}>
        <Icon name={item.ticked ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} size={26} color={item.ticked ? C.primary : C.textLight} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Icon name={item.task.icon} size={16} color={C.textMid} />
          <Text raw style={[st.title, item.ticked && st.doneTxt]}>
            {item.title}
          </Text>
        </View>
        <Text raw style={st.detail}>
          {item.detail}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          <View style={[st.badge, { backgroundColor: s.tint }]}>
            <Text style={[st.badgeTxt, { color: s.color }]}>{s.label}</Text>
          </View>
          <Text raw style={st.when}>
            {showField ? `${item.farmName}: ` : ''}
            {when}
          </Text>
        </View>
      </View>
      {item.status === 'missed' ? null : <Text raw style={st.day}>{t('Day {n}', { n: item.task.start })}</Text>}
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, marginTop: 8 },
  tick: { paddingTop: 2 },
  title: { fontSize: 15, fontWeight: '800', color: C.text, flexShrink: 1 },
  doneTxt: { textDecorationLine: 'line-through', color: C.textSub },
  detail: { fontSize: 13, color: C.textMid, lineHeight: 19, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeTxt: { fontSize: 11, fontWeight: '800' },
  when: { fontSize: 12, color: C.textSub, fontWeight: '600' },
  day: { fontSize: 11, color: C.textLight, fontWeight: '700' },
});
