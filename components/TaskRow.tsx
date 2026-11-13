// One crop-calendar task: a tick circle, the task in a few words and when.
// The how-to opens only when tapped, so a list of tasks stays light to read.
import React, { useState } from 'react';
import { LayoutAnimation, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Btn, Dot, Icon, ListenButton, Text, tick } from './ui';
import { openScanner } from '../lib/navigation';
import { StoryPhoto } from './StoryPhoto';
import { sceneFor, sceneIcon } from '../lib/storyScene';
import { locale, useLang } from '../lib/i18n';
import type { FieldTask, TaskStatus } from '../lib/calendar';
import { C, FONT } from '../lib/theme';

const STATUS: Record<TaskStatus, { label: string; color: string }> = {
  done: { label: 'Done', color: C.primary },
  now: { label: 'Now', color: C.primaryDark },
  soon: { label: 'This week', color: C.accentDark },
  later: { label: 'Coming up', color: C.textSub },
  missed: { label: 'Missed', color: C.error },
};

export function TaskRow({ item, onToggle, showField, crop }: { item: FieldTask; onToggle: () => void; showField?: boolean; crop?: string | null }) {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const { width } = useWindowDimensions();
  // The picture comes from the English task text, so both languages show the same scene.
  const sceneText = `${item.task.title.en}. ${item.task.detail.en}`;
  const icon = sceneIcon(sceneFor(sceneText));
  const s = STATUS[item.status];
  const fmt = (d: Date) => d.toLocaleDateString(locale(lang), { day: 'numeric', month: 'short' });
  const when = item.task.start === item.task.end ? fmt(item.startDate) : `${fmt(item.startDate)} – ${fmt(item.endDate)}`;
  return (
    <View style={st.row}>
      <TouchableOpacity
        onPress={() => {
          tick(item.ticked ? 'light' : 'success');
          onToggle();
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.ticked }}
        hitSlop={10}
        style={{ paddingTop: 1 }}
      >
        <Icon name={item.ticked ? 'check-circle' : 'circle-outline'} size={28} color={item.ticked ? C.primary : item.status === 'missed' ? C.error : C.textLight} />
      </TouchableOpacity>
      <TouchableOpacity
        style={{ flex: 1 }}
        activeOpacity={0.7}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen(!open);
        }}
        accessibilityRole="button"
        accessibilityHint={t('Shows how to do it')}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name={icon} size={22} color={C.textMid} />
          <Text raw style={[st.title, { flex: 1 }, item.ticked && st.doneTxt]}>
            {item.title}
          </Text>
        </View>
        <View style={st.meta}>
          {item.status !== 'later' && !item.ticked ? (
            <>
              <Dot color={s.color} size={7} />
              <Text style={[st.when, { color: s.color, fontFamily: FONT.bodyBold }]}>{s.label}</Text>
              <Text raw style={st.when}>·</Text>
            </>
          ) : null}
          <Text raw style={st.when}>
            {showField ? `${item.farmName} · ` : ''}
            {when}
          </Text>
        </View>
        {open ? (
          <View style={{ marginTop: 10, gap: 10 }}>
            <StoryPhoto text={sceneText} crop={crop} width={width - 120} rounded={14} />
            <Text raw style={st.detail}>
              {item.detail}
            </Text>
            <ListenButton text={`${item.title}. ${item.detail}`} />
            {/scout|inspect|check (the )?leaves/i.test(`${item.task.title.en} ${item.task.detail.en}`) ? (
              <Btn label="Scan a leaf" icon="line-scan" kind="signature" onPress={openScanner} />
            ) : null}
          </View>
        ) : null}
      </TouchableOpacity>
      <Icon name={open ? 'chevron-up' : 'chevron-down'} size={20} color={C.textLight} style={{ paddingTop: 3 }} />
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 12 },
  title: { fontSize: 16, color: C.text, lineHeight: 21 },
  doneTxt: { textDecorationLine: 'line-through', color: C.textLight },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  when: { fontSize: 14, color: C.textSub },
  detail: { fontSize: 15, color: C.textMid, lineHeight: 22 },
});
