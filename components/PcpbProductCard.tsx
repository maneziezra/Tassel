// Tassel — one PCPB-registered product, shown the same way on the scan result,
// the advisory story and the spray calculator. The dose line appears only when
// it is quoted from the label (lib/pcpbCore.ts); otherwise "See the label".

import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Icon, Press, Text } from './ui';
import { useLang } from '../lib/i18n';
import { fmtDose, isMancozeb, labelUrl, labelUse, MANCOZEB_REVIEW, type PcpbProduct, type ProblemKey } from '../lib/pcpb';
import { C, FONT } from '../lib/theme';

export function PcpbProductCard({
  product,
  crop,
  problem,
  selected,
  onPress,
  onPanel,
}: {
  product: PcpbProduct;
  crop: string | null;
  problem: ProblemKey | null;
  selected?: boolean;
  onPress?: () => void;
  /** Set when the card sits on a white panel: it then uses the paper ground. */
  onPanel?: boolean;
}) {
  const { t } = useLang();
  const use = labelUse(product, crop, problem);
  const perTank = fmtDose(use?.perTank20 ?? null);
  const perHa = fmtDose(use?.perHa ?? null);
  const url = labelUrl(product);

  const body = (
    <>
      <View style={st.top}>
        <Text raw style={st.name} numberOfLines={2}>
          {product.d}
        </Text>
        <Text raw style={st.reg}>
          {product.r}
        </Text>
      </View>
      <Text raw style={st.active}>
        {product.a}
      </Text>
      {use ? (
        <View style={st.doseRow}>
          <Icon name="beaker-outline" size={18} color={C.primaryDark} />
          <Text raw style={st.dose}>
            {perTank ? t('Label: {dose} per 20 L', { dose: perTank }) : t('Label: {dose} per hectare', { dose: perHa ?? '' })}
            {use.phiDays !== undefined ? ` · ${t('Harvest {n} days after spraying', { n: use.phiDays })}` : ''}
          </Text>
        </View>
      ) : (
        <Text style={st.seeLabel}>See the label for the dose</Text>
      )}
      {product.lab?.warning ? <Text style={st.warn}>{product.lab.warning}</Text> : null}
      {isMancozeb(product) ? <Text style={st.warn}>{MANCOZEB_REVIEW}</Text> : null}
    </>
  );

  return (
    <View style={[st.card, onPanel && { backgroundColor: C.bg }, selected && st.cardOn]}>
      {onPress ? (
        <Press haptic onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!selected }} style={{ gap: 4 }}>
          {body}
        </Press>
      ) : (
        <View style={{ gap: 4 }}>{body}</View>
      )}
      {url ? (
        <Press
          onPress={() => Linking.openURL(url).catch(() => {})}
          accessibilityRole="link"
          accessibilityLabel={t('Open the PCPB label for {name}', { name: product.d })}
          style={st.labelLink}
        >
          <Icon name="file-document-outline" size={18} color={C.primary} />
          <Text style={st.labelLinkTxt}>Open the official label</Text>
        </Press>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 14, borderWidth: 2, borderColor: 'transparent' },
  cardOn: { borderColor: C.primary },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  name: { flex: 1, fontSize: 17, fontFamily: FONT.bodyBold, color: C.text },
  reg: { fontSize: 13, fontFamily: FONT.bodyBold, color: C.primary, marginTop: 2 },
  active: { fontSize: 15, color: C.textMid },
  doseRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dose: { flex: 1, fontSize: 15, fontFamily: FONT.bodyBold, color: C.primaryDark },
  seeLabel: { fontSize: 15, color: C.textSub, marginTop: 4 },
  warn: { fontSize: 14, color: C.error, marginTop: 2 },
  labelLink: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, marginTop: 2 },
  labelLinkTxt: { fontSize: 15, fontFamily: FONT.bodyBold, color: C.primary },
});
