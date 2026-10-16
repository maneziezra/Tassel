import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Icon, Text, type IconName } from './ui';
import { useLang } from '../lib/i18n';
import { C } from '../lib/theme';

export function AuthField({
  icon,
  label,
  value,
  onChange,
  secure,
  keyboard,
  autoCap = 'none',
}: {
  icon: IconName;
  label: string;
  value: string;
  onChange: (t: string) => void;
  secure?: boolean;
  keyboard?: 'email-address' | 'default';
  autoCap?: 'none' | 'words';
}) {
  const { t } = useLang();
  const [focus, setFocus] = useState(false);
  const [show, setShow] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={st.fieldLabel}>{label}</Text>
      <View style={[st.fieldRow, focus && { borderColor: C.primary, backgroundColor: C.primaryTint }]}>
        <Icon name={icon} size={20} color={focus ? C.primary : C.textSub} />
        <TextInput
          style={st.fieldInput}
          value={value}
          onChangeText={onChange}
          secureTextEntry={secure && !show}
          keyboardType={keyboard ?? 'default'}
          autoCapitalize={autoCap}
          autoCorrect={false}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
        />
        {secure ? (
          <TouchableOpacity onPress={() => setShow((s) => !s)} accessibilityLabel={t(show ? 'Hide password' : 'Show password')}>
            <Icon name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.textSub} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  fieldLabel: { fontSize: 13, fontWeight: '700', color: C.textMid, marginBottom: 6 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5, borderColor: C.border },
  fieldInput: { flex: 1, fontSize: 15, color: C.text, fontWeight: '500', padding: 0 },
});
