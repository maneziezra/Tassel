// Sign in — v1.0 login design, now using Supabase Auth (v1.0 called a mock).
// Signing in is optional: the app works as a guest from the first launch.

import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Header, Icon, Text } from '../components/ui';
import { tr as t } from '../lib/i18n';
import { AuthField } from '../components/AuthField';
import { sendPasswordReset, signIn } from '../lib/session';
import { C } from '../lib/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email.trim() || !password) {
      Alert.alert(t('Missing details'), t('Enter your email and password.'));
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/');
    } catch (e) {
      Alert.alert(t('Sign-in failed'), e instanceof Error ? e.message : '');
    } finally {
      setLoading(false);
    }
  };

  const forgot = async () => {
    if (!email.trim()) {
      Alert.alert(t('Enter your email'), t('Type your email above, then tap "Forgot password?" again.'));
      return;
    }
    try {
      await sendPasswordReset(email.trim());
      Alert.alert(t('Check your email'), t('If an account exists for this email, a reset link has been sent.'));
    } catch (e) {
      Alert.alert(t('Could not send'), e instanceof Error ? e.message : '');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Sign in" />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={st.logoBlock}>
          <View style={st.logo}>
            <Icon name="sprout" size={40} color="#fff" />
          </View>
          <Text style={st.app}>Tassel</Text>
          <Text style={st.tag}>Smart farming for Kenyan farmers</Text>
        </View>
        <View style={st.card}>
          <Text style={st.cardTitle}>Welcome back</Text>
          <Text style={st.cardSub}>Sign in to see the fields and scans you backed up.</Text>
          <AuthField icon="email-outline" label="Email" value={email} onChange={setEmail} keyboard="email-address" />
          <AuthField icon="lock-outline" label="Password" value={password} onChange={setPassword} secure />
          <TouchableOpacity style={{ alignSelf: 'flex-end', marginBottom: 10 }} onPress={forgot}>
            <Text style={st.link}>Forgot password?</Text>
          </TouchableOpacity>
          <Btn label="Sign in" icon="login" onPress={login} loading={loading} />
          <Text style={st.note}>Signing in switches this phone to that account. Anything saved as a guest on this phone stays in the guest account.</Text>
        </View>
        <TouchableOpacity style={st.secondary} onPress={() => router.replace('/register')}>
          <Icon name="account-plus-outline" size={20} color={C.primary} />
          <Text style={st.secondaryTxt}>Back up this phone instead</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ alignSelf: 'center', marginTop: 14 }} onPress={() => router.back()}>
          <Text style={{ color: C.textSub, fontWeight: '600' }}>Continue as guest</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  logoBlock: { alignItems: 'center', paddingTop: 28, paddingBottom: 24 },
  logo: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  app: { fontSize: 30, fontWeight: '900', color: C.text, letterSpacing: -1 },
  tag: { fontSize: 15, color: C.textSub, fontWeight: '500', marginTop: 4 },
  card: { backgroundColor: C.surface, marginHorizontal: 16, borderRadius: 20, padding: 20 },
  cardTitle: { fontSize: 24, fontWeight: '900', color: C.text },
  cardSub: { fontSize: 14, color: C.textSub, marginTop: 4, marginBottom: 20 },
  link: { fontSize: 13, color: C.primary, fontWeight: '800' },
  note: { fontSize: 12, color: C.textSub, marginTop: 14, lineHeight: 17 },
  secondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginHorizontal: 16, marginTop: 20, paddingVertical: 15, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.primary },
  secondaryTxt: { fontSize: 15, fontWeight: '800', color: C.primary },
});
