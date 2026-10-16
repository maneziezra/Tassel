// "How CropGuard works" — the methodology, its limits and the data sources,
// written for farmers, teachers and KSEF judges. Each line is written in both
// English and Kiswahili here (too long for the shared dictionary).

import React from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Card, Header, Icon, Text, type IconName } from '../components/ui';
import { useLang } from '../lib/i18n';
import { C } from '../lib/theme';

type L = { en: string; sw: string };
const SECTIONS: { icon: IconName; title: L; lines: L[] }[] = [
  {
    icon: 'line-scan',
    title: { en: '1. Leaf scanner (on the phone)', sw: '1. Skana ya majani (kwenye simu)' },
    lines: [
      {
        en: 'Model: MobileNetV2 image classifier trained on the PlantVillage dataset (Kaggle) — 38 classes covering 14 crops, including healthy leaves.',
        sw: 'Modeli: kitambuzi cha picha cha MobileNetV2 kilichofunzwa kwa hifadhidata ya PlantVillage (Kaggle) — madaraja 38 ya mazao 14, pamoja na majani yenye afya.',
      },
      {
        en: 'Pipeline: centre-crop the photo to a square → resize to 224×224 pixels → scale each colour value to the range −1…1 → run the model with TensorFlow Lite on the phone. No internet needed.',
        sw: 'Hatua: kata katikati ya picha iwe mraba → badilisha ukubwa hadi pikseli 224×224 → weka kila thamani ya rangi kati ya −1…1 → endesha modeli kwa TensorFlow Lite kwenye simu. Hakuna haja ya intaneti.',
      },
      {
        en: 'Accuracy: 97.4% on the PlantVillage validation set (from the training run). In our own check on 40 labelled PlantVillage images the app scored 95% with the correct scaling and only 77.5% with the scaling used in v1.0 — that bug is fixed.',
        sw: 'Usahihi: 97.4% kwenye seti ya majaribio ya PlantVillage (kutoka mafunzo). Katika ukaguzi wetu wa picha 40 zenye majibu, programu ilipata 95% kwa upimaji sahihi na 77.5% tu kwa upimaji uliotumika katika toleo 1.0 — hitilafu hiyo imerekebishwa.',
      },
      {
        en: 'Confidence: below 75% the app says it is not sure instead of giving a diagnosis. The same 75% rule is used by the AI advisor.',
        sw: 'Uhakika: chini ya 75% programu husema haina uhakika badala ya kutoa utambuzi. Kanuni hiyo hiyo ya 75% inatumiwa na mshauri wa AI.',
      },
    ],
  },
  {
    icon: 'alert-outline',
    title: { en: '2. Limits we are honest about', sw: '2. Mipaka tunayoieleza wazi' },
    lines: [
      {
        en: 'PlantVillage photos are single leaves on plain backgrounds taken in a lab. Field photos with soil, shadows or several leaves are harder, so real-world accuracy will be lower than 97.4% until we test it on Kenyan field photos.',
        sw: 'Picha za PlantVillage ni za jani moja kwenye mandhari tupu zilizopigwa maabara. Picha za shambani zenye udongo, vivuli au majani mengi ni ngumu zaidi, kwa hivyo usahihi halisi utakuwa chini ya 97.4% hadi tuijaribu kwa picha za mashamba ya Kenya.',
      },
      {
        en: 'The scanner only knows the 38 classes. It cannot detect insect pests (e.g. fall armyworm), maize lethal necrosis, bean or cassava diseases. The library marks these as "reference only".',
        sw: 'Skana inajua madaraja 38 tu. Haiwezi kutambua wadudu (mf. viwavijeshi vamizi), ugonjwa wa MLN wa mahindi, magonjwa ya maharagwe au muhogo. Maktaba inayaonyesha haya kama "marejeleo tu".',
      },
      {
        en: 'CropGuard supports, but does not replace, an agricultural extension officer.',
        sw: 'CropGuard inamsaidia, lakini haichukui nafasi ya, afisa wa ugani wa kilimo.',
      },
    ],
  },
  {
    icon: 'medical-bag',
    title: { en: '3. Treatment advice', sw: '3. Ushauri wa matibabu' },
    lines: [
      {
        en: 'Every detectable disease has written cultural, biological and chemical options and a generated day-by-day plan.',
        sw: 'Kila ugonjwa unaotambulika una chaguo za kilimo bora, kibiolojia na kemikali zilizoandikwa, pamoja na mpango wa siku kwa siku.',
      },
      {
        en: 'Products withdrawn or restricted in the Pest Control Products Board review of June 2025 are not recommended for open fields (chlorothalonil, chlorpyrifos, dimethoate, imidacloprid, abamectin; iprodione on food crops). Mancozeb was under review and is flagged.',
        sw: 'Bidhaa zilizoondolewa au kuwekewa vikwazo katika ukaguzi wa PCPB wa Juni 2025 hazipendekezwi kwa mashamba ya wazi (chlorothalonil, chlorpyrifos, dimethoate, imidacloprid, abamectin; iprodione kwa mazao ya chakula). Mancozeb ilikuwa ikikaguliwa na imewekewa tahadhari.',
      },
      {
        en: 'Chemical options name the active ingredient only. Farmers are told to buy a PCPB-registered product for their crop and follow the label rate, protective clothing and pre-harvest interval.',
        sw: 'Chaguo za kemikali zinataja kiambato hai tu. Wakulima wanaambiwa wanunue bidhaa iliyosajiliwa na PCPB kwa zao lao na wafuate kiwango cha lebo, mavazi ya kujikinga na muda wa kusubiri kabla ya kuvuna.',
      },
    ],
  },
  {
    icon: 'robot-outline',
    title: { en: '4. AI farm advisor', sw: '4. Mshauri wa shamba wa AI' },
    lines: [
      {
        en: 'Questions go to Claude (Anthropic) through our own server (a Supabase Edge Function). The API key stays on the server, never in the app.',
        sw: 'Maswali hutumwa kwa Claude (Anthropic) kupitia seva yetu (Supabase Edge Function). Ufunguo wa API unabaki kwenye seva, kamwe si kwenye programu.',
      },
      {
        en: 'The server adds safety rules: low-cost methods first, only registered products, no doses above the label, say when unsure, reply in Kiswahili when asked.',
        sw: 'Seva inaongeza kanuni za usalama: mbinu za gharama nafuu kwanza, bidhaa zilizosajiliwa tu, hakuna kipimo juu ya lebo, kusema inapokosa uhakika, na kujibu kwa Kiswahili ikiombwa.',
      },
      {
        en: 'Each phone can ask 20 questions per hour, and the whole app 500 per day, to control cost and abuse.',
        sw: 'Kila simu inaweza kuuliza maswali 20 kwa saa, na programu nzima 500 kwa siku, ili kudhibiti gharama na matumizi mabaya.',
      },
      {
        en: 'AI photo check (online, only when the farmer chooses it): for insect pests, nutrient deficiencies, weather damage and crops outside the 38 classes. One photo is shrunk on the phone (longest side 1,024 px, location data removed) and sent to Claude with the same safety rules. It returns the crop, the most likely cause and its type, a low/medium/high confidence, the visible signs, what to check in the field and what to do. The photo is not stored. It counts towards the same 20-per-hour limit and is labelled as an AI suggestion, not a lab test.',
        sw: 'Ukaguzi wa picha wa AI (kwa intaneti, mkulima akichagua tu): kwa wadudu, upungufu wa virutubisho, madhara ya hali ya hewa na mazao nje ya madaraja 38. Picha moja hupunguzwa kwenye simu (upande mrefu pikseli 1,024, data ya eneo huondolewa) na kutumwa kwa Claude ikiwa na kanuni zile zile za usalama. Inarudisha zao, chanzo kinachowezekana zaidi na aina yake, uhakika wa chini/wastani/juu, dalili zinazoonekana, cha kukagua shambani na cha kufanya. Picha haihifadhiwi. Inahesabiwa katika kikomo kile kile cha 20 kwa saa na inaonyeshwa kama pendekezo la AI, si kipimo cha maabara.',
      },
    ],
  },
  {
    icon: 'weather-partly-rainy',
    title: { en: '5. Weather, blight risk and spray days', sw: '5. Hali ya hewa, hatari ya baa na siku za kunyunyizia' },
    lines: [
      {
        en: 'Forecasts come from Open-Meteo for your location (or your field).',
        sw: 'Utabiri unatoka Open-Meteo kwa eneo lako (au shamba lako).',
      },
      {
        en: 'Late blight risk uses the Hutton criteria: two days in a row with a minimum temperature of at least 10 °C and at least 6 hours of humidity at 90% or more. It was developed for potatoes in the UK, so we show it as a warning, not a diagnosis.',
        sw: 'Hatari ya baa chelewa inatumia vigezo vya Hutton: siku mbili mfululizo zenye joto la chini la angalau 10 °C na angalau saa 6 za unyevunyevu wa 90% au zaidi. Viliundwa kwa viazi nchini Uingereza, kwa hivyo tunaionyesha kama tahadhari, si utambuzi.',
      },
      {
        en: 'Spray days: an hour between 06:00 and 18:00 is "sprayable" when wind is under 15 km/h, temperature is 10–30 °C, and no rain is forecast (under 0.1 mm and under 40% chance) for that hour and the next 6. A day with 3 or more such hours is Good, 1–2 is Fair, none is Poor. The best window is shown.',
        sw: 'Siku za kunyunyizia: saa kati ya saa 12 asubuhi na saa 12 jioni inafaa wakati upepo uko chini ya km/saa 15, joto ni 10–30 °C, na hakuna mvua inayotabiriwa (chini ya mm 0.1 na uwezekano chini ya 40%) kwa saa hiyo na 6 zinazofuata. Siku yenye saa 3 au zaidi ni Nzuri, 1–2 ni Wastani, sifuri ni Mbaya. Muda bora zaidi unaonyeshwa.',
      },
    ],
  },
  {
    icon: 'calendar-check-outline',
    title: { en: '6. Field mapping and crop calendar', sw: '6. Ramani ya shamba na kalenda ya zao' },
    lines: [
      {
        en: 'You tap the corners of a field on free satellite imagery (Esri) or OpenStreetMap. The area is calculated with the spherical polygon formula used by mapping software, then converted to acres (1 acre = 4,046.86 m²).',
        sw: 'Unagusa pembe za shamba kwenye picha za setilaiti (Esri) au OpenStreetMap. Eneo linahesabiwa kwa fomula ya poligoni ya duara inayotumiwa na programu za ramani, kisha kubadilishwa kuwa ekari (ekari 1 = m² 4,046.86).',
      },
      {
        en: 'Crop calendar: for maize, beans, potato, tomato and wheat, each task (weeding, top-dressing, scouting, spraying, harvest) is set as a number of days after the planting date you enter. Timings are typical Kenyan guide values and change with variety, altitude and rain.',
        sw: 'Kalenda ya zao: kwa mahindi, maharagwe, viazi, nyanya na ngano, kila kazi (kupalilia, mbolea ya juu, ukaguzi, kunyunyizia, mavuno) imewekwa kama idadi ya siku baada ya tarehe ya kupanda unayoandika. Muda huu ni wa kawaida kwa Kenya na hubadilika kulingana na aina ya mbegu, mwinuko na mvua.',
      },
      {
        en: 'Reminders are scheduled on the phone itself for 07:00 on the first day of each task, so they work without internet. Ticked tasks are saved on the phone.',
        sw: 'Vikumbusho hupangwa kwenye simu yenyewe saa 1:00 asubuhi siku ya kwanza ya kila kazi, kwa hivyo vinafanya kazi bila intaneti. Kazi ulizotia alama huhifadhiwa kwenye simu.',
      },
    ],
  },
  {
    icon: 'alert-decagram-outline',
    title: { en: '7. Outbreak alerts by county', sw: '7. Tahadhari za milipuko kwa kaunti' },
    lines: [
      {
        en: 'When a farmer saves a confident scan (not "unclear", not healthy) to a field, it counts towards their county. A disease is shown only when at least 2 different farmers in the county found it in the last 14 (or 30) days.',
        sw: 'Mkulima akihifadhi skani yenye uhakika (si "isiyo wazi", si yenye afya) kwenye shamba, inahesabiwa kwa kaunti yake. Ugonjwa huonyeshwa tu wakulima angalau 2 tofauti katika kaunti wakiupata katika siku 14 (au 30) zilizopita.',
      },
      {
        en: "Only totals leave the database: no names, fields or GPS points. The 2-farmer rule stops one person's farm from being identified and makes one wrong scan less likely to raise an alarm.",
        sw: 'Jumla tu ndizo hutoka kwenye hifadhidata: hakuna majina, mashamba wala alama za GPS. Kanuni ya wakulima 2 inazuia shamba la mtu mmoja kutambulika na inapunguza uwezekano wa skani moja yenye makosa kuzua taharuki.',
      },
    ],
  },
  {
    icon: 'chart-line',
    title: { en: '8. Prices and agro-dealers', sw: '8. Bei na maduka ya pembejeo' },
    lines: [
      {
        en: 'Reference prices are monthly averages from the IFPRI Food Security Portal Kenya reports, shown with their date and source. They are not live prices.',
        sw: 'Bei za marejeleo ni wastani wa kila mwezi kutoka ripoti za IFPRI Food Security Portal Kenya, zikionyeshwa na tarehe na chanzo. Si bei za moja kwa moja.',
      },
      {
        en: 'Farmer prices: farmers report what they were paid. The app shows the median (middle value) per crop, county and unit for the last 30 days, only once 3 or more farmers have reported it (with only 2, each could work out the other price), and never who reported. A plausibility check catches typing mistakes and each phone can send up to 20 reports a day.',
        sw: 'Bei za wakulima: wakulima huripoti bei waliyolipwa. Programu huonyesha wastani wa kati kwa kila zao, kaunti na kipimo kwa siku 30 zilizopita, tu wakulima 3 au zaidi wakiwa wameripoti (wakiwa 2, kila mmoja angeweza kujua bei ya mwenzake), na kamwe si aliyeripoti. Ukaguzi wa uhalisia hunasa makosa ya kuandika na kila simu inaweza kutuma ripoti hadi 20 kwa siku.',
      },
      {
        en: 'Agro-dealers are found on OpenStreetMap (shop=agrarian or "agrovet" in the name). Shops that are not mapped will not appear.',
        sw: 'Maduka ya pembejeo hupatikana kwenye OpenStreetMap (shop=agrarian au "agrovet" kwenye jina). Maduka yasiyo kwenye ramani hayataonekana.',
      },
    ],
  },
  {
    icon: 'account-group-outline',
    title: { en: '9. Community, language and voice', sw: '9. Jamii, lugha na sauti' },
    lines: [
      {
        en: 'Farmers can attach a photo and their scan result to a question. Photos are shrunk to 1080 px before upload. Posts reported by 3 people are hidden automatically.',
        sw: 'Wakulima wanaweza kuambatisha picha na matokeo ya skani kwenye swali. Picha hupunguzwa hadi px 1080 kabla ya kupakiwa. Machapisho yaliyoripotiwa na watu 3 hufichwa yenyewe.',
      },
      {
        en: "The whole app, all 38 disease guides, the library and the season guides are available in Kiswahili. \"Listen\" reads the text aloud with the phone's own text-to-speech, which works offline.",
        sw: 'Programu nzima, miongozo yote 38 ya magonjwa, maktaba na miongozo ya msimu inapatikana kwa Kiswahili. "Sikiliza" husoma maandishi kwa sauti kwa kutumia sauti ya simu yenyewe, inayofanya kazi bila intaneti.',
      },
    ],
  },
  {
    icon: 'shield-lock-outline',
    title: { en: '10. Privacy', sw: '10. Faragha' },
    lines: [
      {
        en: 'Photos are analysed on the phone and not uploaded unless you attach one to a post or choose the AI photo check. Profiles, fields, saved scans, price reports and posts are stored in your account with row-level security, so only you can read your farm data. No ads.',
        sw: 'Picha huchambuliwa kwenye simu na hazipakiwi isipokuwa ukiambatisha moja kwenye chapisho au ukichagua ukaguzi wa picha wa AI. Wasifu, mashamba, skani zilizohifadhiwa, ripoti za bei na machapisho huhifadhiwa kwenye akaunti yako kwa usalama wa kila safu, kwa hivyo ni wewe tu unayeweza kusoma data ya shamba lako. Hakuna matangazo.',
      },
    ],
  },
];

export default function MethodologyScreen() {
  const { lang } = useLang();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="How CropGuard works" subtitle="Methods, limits and sources" />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        {SECTIONS.map((s) => (
          <Card key={s.title.en}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <View style={st.icon}>
                <Icon name={s.icon} size={20} color={C.primary} />
              </View>
              <Text raw style={st.title}>
                {s.title[lang]}
              </Text>
            </View>
            {s.lines.map((l) => (
              <Text raw key={l.en} style={st.line}>
                {`• ${l[lang]}`}
              </Text>
            ))}
          </Card>
        ))}
        <Text style={st.link} onPress={() => Linking.openURL('https://www.kaggle.com/datasets/abdallahalidev/plantvillage-dataset')}>
          PlantVillage dataset on Kaggle ↗
        </Text>
        <Text style={st.link} onPress={() => Linking.openURL('https://www.pcpb.go.ke')}>
          Pest Control Products Board ↗
        </Text>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  icon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.primaryTint, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, fontSize: 16, fontWeight: '900', color: C.text },
  line: { fontSize: 14, color: C.textMid, lineHeight: 21, marginTop: 6 },
  link: { color: C.info, fontWeight: '700', textAlign: 'center', marginTop: 16 },
});
