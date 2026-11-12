// Create account / back up — v1.0 register design (name, phone, county, email,
// password). v2.0 attaches the email to the phone's existing guest account, so
// fields, scans and posts made before signing up are kept.

import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Chip, Header, Text } from '../components/ui';
import { tr as t } from '../lib/i18n';
import { AuthField } from '../components/AuthField';
import { saveProfile } from '../lib/data';
import { COUNTIES } from '../lib/counties';
import { upgradeAccount } from '../lib/session';
import { C } from '../lib/theme';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [county, setCounty] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert(t('Missing details'), t('Enter your name, email and a password.'));
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      Alert.alert(t('Check your email'), t('That email address does not look right.'));
      return;
    }
    if (password.length < 8) {
      Alert.alert(t('Weak password'), t('Use at least 8 characters.'));
      return;
    }
    if (password !== confirm) {
      Alert.alert(t('Passwords differ'), t('The two passwords do not match.'));
      return;
    }
    setLoading(true);
    try {
      await saveProfile({ name, phone, county, crops: null });
      const { needsConfirmation } = await upgradeAccount(email.trim(), password, name.trim());
      Alert.alert(
        t(needsConfirmation ? 'Confirm your email' : 'Account ready'),
        needsConfirmation
          ? t('We sent a link to {email}. Open it to finish backing up. You can keep using the app meanwhile.', { email: email.trim() })
          : t('Signed in as {name}. Your fields and scans are backed up.', { name: name.trim().split(' ')[0] }),
        [{ text: t('OK'), onPress: () => router.replace('/profile') }]
      );
    } catch (e) {
      Alert.alert(t('Could not create the account'), e instanceof Error ? e.message : '');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Create account" subtitle="Back up your fields and scans" />
      <ScrollView contentContainerStyle={{ paddingBottom: 48, paddingTop: 12 }} keyboardShouldPersistTaps="handled">
        <View style={st.card}>
          <Text style={st.section}>Personal info</Text>
          <AuthField icon="account-outline" label="Full name" value={name} onChange={setName} autoCap="words" />
          <AuthField icon="phone-outline" label="Phone number (optional)" value={phone} onChange={setPhone} />
          <Text style={st.section}>Your county</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
            {COUNTIES.map((c) => (
              <Chip key={c} label={c} raw active={county === c} onPress={() => setCounty(c)} />
            ))}
          </ScrollView>
          <Text style={st.section}>Account</Text>
          <AuthField icon="email-outline" label="Email" value={email} onChange={setEmail} keyboard="email-address" />
          <AuthField icon="lock-outline" label="Password (min 8 characters)" value={password} onChange={setPassword} secure />
          <AuthField icon="lock-check-outline" label="Confirm password" value={confirm} onChange={setConfirm} secure />
          <Btn label="Create account" icon="account-plus-outline" onPress={submit} loading={loading} />
          <Text style={st.terms}>Your farm data stays private to your account. Forum posts show your name to other farmers.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: C.surface, marginHorizontal: 16, borderRadius: 20, padding: 20 },
  section: { fontSize: 11, fontWeight: '800', color: C.textSub, letterSpacing: 0.8, marginBottom: 10, marginTop: 4 },
  terms: { fontSize: 12, color: C.textSub, textAlign: 'center', marginTop: 14, lineHeight: 18 },
});
