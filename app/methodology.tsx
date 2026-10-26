// "How Tassel works" — the methodology, its limits and the data sources,
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
        en: 'Model: MobileNetV2 image classifier (model v5) that knows 154 leaf classes on 34 crops: 123 diseases and pests plus 31 healthy classes. It was trained on 162,201 photos from 31 public datasets (listed at the end of this page): 111,460 field photos and 50,741 lab photos from PlantVillage.',
        sw: 'Modeli: kitambuzi cha picha cha MobileNetV2 (modeli v5) kinachojua madaraja 154 ya majani kwenye mazao 34: magonjwa na wadudu 123 pamoja na madaraja 31 ya majani yenye afya. Kilifunzwa kwa picha 162,201 kutoka hifadhidata 31 za umma (zimeorodheshwa mwisho wa ukurasa huu): picha 111,460 za shambani na picha 50,741 za maabara kutoka PlantVillage.',
      },
      {
        en: 'Before training, 64,190 duplicate photos were removed, and copies of the same photo (flipped, rotated or brightened) were kept together on one side of the split, so test photos are never near-copies of training photos.',
        sw: 'Kabla ya mafunzo, picha 64,190 zilizojirudia ziliondolewa, na nakala za picha moja (zilizogeuzwa, kuzungushwa au kuongezwa mwanga) ziliwekwa pamoja upande mmoja, kwa hivyo picha za majaribio si nakala za picha za mafunzo.',
      },
      {
        en: 'Pipeline: centre-crop the photo to a square → resize to 224×224 pixels → scale each colour value to the range −1…1 → run the model with TensorFlow Lite on the phone. No internet needed.',
        sw: 'Hatua: kata katikati ya picha iwe mraba → badilisha ukubwa hadi pikseli 224×224 → weka kila thamani ya rangi kati ya −1…1 → endesha modeli kwa TensorFlow Lite kwenye simu. Hakuna haja ya intaneti.',
      },
      {
        en: 'Accuracy on 16,254 test photos the model never saw: 94.0% overall, 91.5% on field photos and 98.7% on lab photos. The phone version (TensorFlow Lite, 4.9 MB) gave the same answers as the full model in our checks.',
        sw: 'Usahihi kwenye picha 16,254 za majaribio ambazo modeli haikuwahi kuona: 94.0% kwa jumla, 91.5% kwa picha za shambani na 98.7% kwa picha za maabara. Toleo la simu (TensorFlow Lite, MB 4.9) lilitoa majibu sawa na modeli kamili katika ukaguzi wetu.',
      },
      {
        en: 'Confidence: the scores are calibrated so that "80% sure" means right about 8 times in 10 (calibration error fell from 10.7% to 1.0%). Below 75% the app says it is not sure instead of giving a diagnosis. On the test photos it answered 92.7% of the time and was right 97.3% of the time when it answered. The same 75% rule is used by the AI advisor.',
        sw: 'Uhakika: alama zimesawazishwa ili "uhakika 80%" imaanishe kuwa sahihi takriban mara 8 kati ya 10 (kosa la usawazishaji lilishuka kutoka 10.7% hadi 1.0%). Chini ya 75% programu husema haina uhakika badala ya kutoa utambuzi. Kwenye picha za majaribio ilijibu mara 92.7% na ilikuwa sahihi mara 97.3% ilipojibu. Kanuni hiyo hiyo ya 75% inatumiwa na mshauri wa AI.',
      },
    ],
  },
  {
    icon: 'alert-outline',
    title: { en: '2. Limits we are honest about', sw: '2. Mipaka tunayoieleza wazi' },
    lines: [
      {
        en: 'The test photos come from the same 31 datasets as the training photos. On PlantDoc, a small set of real-world photos from the internet, accuracy was only 54%, and cassava field photos scored 80%. Expect lower accuracy on your own farm photos until we test the model on Kenyan fields.',
        sw: 'Picha za majaribio zinatoka katika hifadhidata 31 zile zile za picha za mafunzo. Kwenye PlantDoc, seti ndogo ya picha halisi kutoka mtandaoni, usahihi ulikuwa 54% tu, na picha za shambani za muhogo zilipata 80%. Tarajia usahihi mdogo zaidi kwenye picha za shamba lako hadi tuijaribu modeli kwenye mashamba ya Kenya.',
      },
      {
        en: 'Only one dataset (JMuBEN coffee) was photographed in Kenya; the others come from Uganda, Tanzania, Ethiopia, Ghana, South Asia and elsewhere. Some classes come from other regions: rice tungro (in Kenya, rice yellow mottle virus is more common), Moko disease of banana (in Kenya, banana Xanthomonas wilt looks similar and is more common) and cotton leaf curl (South Asia). Treat these results as a reason to check with an extension officer.',
        sw: 'Hifadhidata moja tu (JMuBEN ya kahawa) ilipigwa picha nchini Kenya; nyingine zinatoka Uganda, Tanzania, Ethiopia, Ghana, Asia Kusini na kwingineko. Baadhi ya madaraja yanatoka maeneo mengine: tungro ya mpunga (nchini Kenya virusi vya madoa ya manjano ya mpunga ni vya kawaida zaidi), ugonjwa wa Moko wa ndizi (nchini Kenya mnyauko bakteria wa ndizi unafanana nao na ni wa kawaida zaidi) na kukunjamana kwa majani ya pamba (Asia Kusini). Chukulia matokeo haya kama sababu ya kumwona afisa wa ugani.',
      },
      {
        en: 'The scanner looks at one leaf. It cannot judge roots, stems, fruit or berries (for example coffee berry disease or bacterial wilt of potato), nutrient deficiencies, or insects other than the 14 pests it was trained on. Sorghum and rice have no healthy class, so a healthy sorghum or rice leaf may get a low-confidence guess. Use the AI photo check or the library\'s "reference only" entries for these.',
        sw: 'Skana inaangalia jani moja. Haiwezi kuchunguza mizizi, mashina, matunda au buni (kwa mfano ugonjwa wa buni za kahawa au mnyauko bakteria wa viazi), upungufu wa virutubisho, au wadudu wengine zaidi ya 14 iliofunzwa. Mtama na mpunga hazina daraja la majani yenye afya, kwa hivyo jani zima la mtama au mpunga linaweza kupata kisio cha uhakika mdogo. Tumia ukaguzi wa picha wa AI au maingizo ya "marejeleo tu" kwenye maktaba kwa haya.',
      },
      {
        en: 'Tassel supports, but does not replace, an agricultural extension officer.',
        sw: 'Tassel inamsaidia, lakini haichukui nafasi ya, afisa wa ugani wa kilimo.',
      },
    ],
  },
  {
    icon: 'medical-bag',
    title: { en: '3. Treatment advice', sw: '3. Ushauri wa matibabu' },
    lines: [
      {
        en: 'All 154 classes have a written guide in English and Kiswahili: cultural, biological and chemical options and a generated day-by-day plan. Healthy classes get good-practice tips.',
        sw: 'Madaraja yote 154 yana mwongozo ulioandikwa kwa Kiingereza na Kiswahili: chaguo za kilimo bora, kibiolojia na kemikali, pamoja na mpango wa siku kwa siku. Madaraja ya majani yenye afya yanapata vidokezo vya kilimo bora.',
      },
      {
        en: 'Maize lethal necrosis and Moko disease of banana are flagged "Report to authorities" so the farmer contacts the county agriculture office.',
        sw: 'Ugonjwa hatari wa mahindi (MLN) na ugonjwa wa Moko wa ndizi vimewekewa alama "Ripoti kwa mamlaka" ili mkulima awasiliane na ofisi ya kilimo ya kaunti.',
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
        en: 'Each phone has an hourly limit on questions, and the whole app a daily limit, to control cost and abuse. The limits are set on the server.',
        sw: 'Kila simu ina kikomo cha maswali kwa saa, na programu nzima kikomo kwa siku, ili kudhibiti gharama na matumizi mabaya. Vikomo vimewekwa kwenye seva.',
      },
      {
        en: 'AI photo check (online, only when the farmer chooses it): for insect pests, nutrient deficiencies, weather damage and problems outside the scanner\'s 154 classes. One photo is shrunk on the phone (longest side 1,024 px, location data removed) and sent to Claude with the same safety rules. It returns the crop, the most likely cause and its type, a low/medium/high confidence, the visible signs, what to check in the field and what to do. The photo is not stored. It counts towards the same hourly limit and is labelled as an AI suggestion, not a lab test.',
        sw: 'Ukaguzi wa picha wa AI (kwa intaneti, mkulima akichagua tu): kwa wadudu, upungufu wa virutubisho, madhara ya hali ya hewa na matatizo nje ya madaraja 154 ya skana. Picha moja hupunguzwa kwenye simu (upande mrefu pikseli 1,024, data ya eneo huondolewa) na kutumwa kwa Claude ikiwa na kanuni zile zile za usalama. Inarudisha zao, chanzo kinachowezekana zaidi na aina yake, uhakika wa chini/wastani/juu, dalili zinazoonekana, cha kukagua shambani na cha kufanya. Picha haihifadhiwi. Inahesabiwa katika kikomo kile kile cha kila saa na inaonyeshwa kama pendekezo la AI, si kipimo cha maabara.',
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
        en: "The whole app, all 154 leaf guides, the library and the season guides are available in Kiswahili. \"Listen\" reads the text aloud with the phone's own text-to-speech, which works offline.",
        sw: 'Programu nzima, miongozo yote 154 ya majani, maktaba na miongozo ya msimu inapatikana kwa Kiswahili. "Sikiliza" husoma maandishi kwa sauti kwa kutumia sauti ya simu yenyewe, inayofanya kazi bila intaneti.',
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
  {
    icon: 'database-outline',
    title: { en: '11. Training data and credits', sw: '11. Data ya mafunzo na shukrani' },
    lines: [
      {
        en: 'The leaf model was trained on these 31 public datasets. Their licences ask us to credit them (MangoLeafBD is for non-commercial use only):',
        sw: 'Modeli ya majani ilifunzwa kwa hifadhidata hizi 31 za umma. Leseni zao zinatutaka tuzitaje (MangoLeafBD ni kwa matumizi yasiyo ya kibiashara tu):',
      },
      { en: "Banana Disease Recognition dataset — Banana Disease Recognition Dataset (Kaggle, sujaykapadnis). Licence: CC BY 4.0.", sw: "Banana Disease Recognition dataset — Banana Disease Recognition Dataset (Kaggle, sujaykapadnis). Licence: CC BY 4.0." },
      { en: "BananaLSD banana leaf spot diseases — BananaLSD: Banana Leaf Spot Diseases dataset (Kaggle, shifatearman). Licence: CC BY-SA 4.0.", sw: "BananaLSD banana leaf spot diseases — BananaLSD: Banana Leaf Spot Diseases dataset (Kaggle, shifatearman). Licence: CC BY-SA 4.0." },
      { en: "iBean (Makerere AI Lab, Uganda): angular leaf spot, rust, healthy — Makerere AI Lab (2020), iBean dataset, https://github.com/AI-Lab-Makerere/ibean. Licence: MIT.", sw: "iBean (Makerere AI Lab, Uganda): angular leaf spot, rust, healthy — Makerere AI Lab (2020), iBean dataset, https://github.com/AI-Lab-Makerere/ibean. Licence: MIT." },
      { en: "BPLD black gram plant leaf disease — Black Gram Plant Leaf Disease (BPLD) dataset (Kaggle, andytingzhiwei). Licence: MIT.", sw: "BPLD black gram plant leaf disease — Black Gram Plant Leaf Disease (BPLD) dataset (Kaggle, andytingzhiwei). Licence: MIT." },
      { en: "Cabbage disease dataset — Cabbage disease dataset (Kaggle, gihozopatrick). Licence: Unknown (see Kaggle page).", sw: "Cabbage disease dataset — Cabbage disease dataset (Kaggle, gihozopatrick). Licence: Unknown (see Kaggle page)." },
      { en: "Cassava Leaf Disease Classification (Makerere / NaCRRI, Uganda) — Mwebaze et al. (2019), iCassava, arXiv:1908.02900. Licence: Kaggle competition rules.", sw: "Cassava Leaf Disease Classification (Makerere / NaCRRI, Uganda) — Mwebaze et al. (2019), iCassava, arXiv:1908.02900. Licence: Kaggle competition rules." },
      { en: "CCMT crop pest & disease dataset (Ghana) — Mensah et al. (2023), Data in Brief 49:109306, doi:10.17632/bwh3zbpkpv.1. Licence: CC BY 4.0.", sw: "CCMT crop pest & disease dataset (Ghana) — Mensah et al. (2023), Data in Brief 49:109306, doi:10.17632/bwh3zbpkpv.1. Licence: CC BY 4.0." },
      { en: "Citrus leaves (Pakistan): black spot, canker, greening, healthy — Rauf et al. (2019), citrus fruits and leaves dataset, Data in Brief. Licence: CC BY 4.0 (original Data in Brief release).", sw: "Citrus leaves (Pakistan): black spot, canker, greening, healthy — Rauf et al. (2019), citrus fruits and leaves dataset, Data in Brief. Licence: CC BY 4.0 (original Data in Brief release)." },
      { en: "Ethiopian coffee leaf disease — Ethiopian Coffee Leaf Disease dataset (Kaggle, biniyamyoseph). Licence: CC0.", sw: "Ethiopian coffee leaf disease — Ethiopian Coffee Leaf Disease dataset (Kaggle, biniyamyoseph). Licence: CC0." },
      { en: "JMuBEN + JMuBEN2 Arabica coffee leaf images (Kenya) — Jepkoech et al. (2021), Arabica coffee leaf images dataset for coffee leaf disease detection and classification, Data in Brief; Mendeley Data t2r6rszp5c and tgv3zb82nd. Licence: CC BY 4.0 (original Mendeley release).", sw: "JMuBEN + JMuBEN2 Arabica coffee leaf images (Kenya) — Jepkoech et al. (2021), Arabica coffee leaf images dataset for coffee leaf disease detection and classification, Data in Brief; Mendeley Data t2r6rszp5c and tgv3zb82nd. Licence: CC BY 4.0 (original Mendeley release)." },
      { en: "RoCoLe robusta coffee leaf images (Ecuador, field) — Parraga-Alava et al. (2019), RoCoLe: A robusta coffee leaf images dataset, Data in Brief; Mendeley Data c5yvn32dzg. Licence: CC BY 4.0 (original); MIT on Kaggle.", sw: "RoCoLe robusta coffee leaf images (Ecuador, field) — Parraga-Alava et al. (2019), RoCoLe: A robusta coffee leaf images dataset, Data in Brief; Mendeley Data c5yvn32dzg. Licence: CC BY 4.0 (original); MIT on Kaggle." },
      { en: "Cotton leaf disease dataset: bacterial blight, leaf curl virus, fusarium wilt, healthy — Cotton leaf disease dataset (Kaggle, seroshkarim). Licence: Unknown (see Kaggle page).", sw: "Cotton leaf disease dataset: bacterial blight, leaf curl virus, fusarium wilt, healthy — Cotton leaf disease dataset (Kaggle, seroshkarim). Licence: Unknown (see Kaggle page)." },
      { en: "Cucumber leaf disease dataset: downy mildew, powdery mildew, healthy — Cucumber Leaf Disease Dataset (Kaggle, kaushigihanml). Licence: Apache 2.0.", sw: "Cucumber leaf disease dataset: downy mildew, powdery mildew, healthy — Cucumber Leaf Disease Dataset (Kaggle, kaushigihanml). Licence: Apache 2.0." },
      { en: "Eggplant Disease Recognition dataset — Eggplant Disease Recognition Dataset (Kaggle, sujaykapadnis). Licence: CC BY 4.0.", sw: "Eggplant Disease Recognition dataset — Eggplant Disease Recognition Dataset (Kaggle, sujaykapadnis). Licence: CC BY 4.0." },
      { en: "MangoLeafBD (Bangladesh) — MangoLeafBD dataset (Kaggle, aryashah2k). Licence: CC BY-NC-SA 4.0 (non-commercial).", sw: "MangoLeafBD (Bangladesh) — MangoLeafBD dataset (Kaggle, aryashah2k). Licence: CC BY-NC-SA 4.0 (non-commercial)." },
      { en: "Pearl millet: healthy, rust, blast — Millet Crop Health Classification (Kaggle, rajsingh365). Licence: Other (see Kaggle page).", sw: "Pearl millet: healthy, rust, blast — Millet Crop Health Classification (Kaggle, rajsingh365). Licence: Other (see Kaggle page)." },
      { en: "PEST_AI / Niayes crops (Senegal) (brinjal and citrus) — PEST_AI Plant Leaf Disease Recognition Dataset (Kaggle, ibrahimagabardiop). Licence: CC0.", sw: "PEST_AI / Niayes crops (Senegal) (brinjal and citrus) — PEST_AI Plant Leaf Disease Recognition Dataset (Kaggle, ibrahimagabardiop). Licence: CC0." },
      { en: "Olive leaf images (Turkey): healthy, peacock spot, olive bud mite (Aculus olearius) — Olive Leaf Image Dataset (Kaggle, habibulbasher01644). Licence: CC0.", sw: "Olive leaf images (Turkey): healthy, peacock spot, olive bud mite (Aculus olearius) — Olive Leaf Image Dataset (Kaggle, habibulbasher01644). Licence: CC0." },
      { en: "Onion diseases (India) — Onion Diseases dataset (Kaggle, tejasbargujepatil). Licence: ODbL.", sw: "Onion diseases (India) — Onion Diseases dataset (Kaggle, tejasbargujepatil). Licence: ODbL." },
      { en: "PlantDoc (real-world photos, IIT Gandhinagar) — Singh et al. (2020), PlantDoc, CoDS-COMAD, doi:10.1145/3371158.3371196. Licence: CC BY 4.0 (images scraped from the web).", sw: "PlantDoc (real-world photos, IIT Gandhinagar) — Singh et al. (2020), PlantDoc, CoDS-COMAD, doi:10.1145/3371158.3371196. Licence: CC BY 4.0 (images scraped from the web)." },
      { en: "PlantVillage — Hughes & Salathe (2015), arXiv:1511.08060; Mohanty, Hughes & Salathe (2016), Front. Plant Sci. 7:1419. Licence: CC BY-SA 3.0.", sw: "PlantVillage — Hughes & Salathe (2015), arXiv:1511.08060; Mohanty, Hughes & Salathe (2016), Front. Plant Sci. 7:1419. Licence: CC BY-SA 3.0." },
      { en: "Potato leaf disease, uncontrolled environment (Central Java) — Shabrina et al. (2024), Data in Brief 52:109955, doi:10.17632/ptz377bwb8.1. Licence: CC BY 4.0.", sw: "Potato leaf disease, uncontrolled environment (Central Java) — Shabrina et al. (2024), Data in Brief 52:109955, doi:10.17632/ptz377bwb8.1. Licence: CC BY 4.0." },
      { en: "Pumpkin leaf diseases (Bangladesh) — Pumpkin Leaf Diseases Dataset From Bangladesh (Kaggle, tahmidmir). Licence: CC BY 4.0.", sw: "Pumpkin leaf diseases (Bangladesh) — Pumpkin Leaf Diseases Dataset From Bangladesh (Kaggle, tahmidmir). Licence: CC BY 4.0." },
      { en: "Rice leaf disease images (Odisha, India): bacterial blight, blast, brown spot, tungro — Sethy et al. (2020), Rice Leaf Disease Image Samples, Mendeley Data fwcj7stb8r. Licence: CC0.", sw: "Rice leaf disease images (Odisha, India): bacterial blight, blast, brown spot, tungro — Sethy et al. (2020), Rice Leaf Disease Image Samples, Mendeley Data fwcj7stb8r. Licence: CC0." },
      { en: "Sorghum disease image dataset — Sorghum Disease Image Dataset (Kaggle, sanskarparadeshi). Licence: Unknown (see Kaggle page).", sw: "Sorghum disease image dataset — Sorghum Disease Image Dataset (Kaggle, sanskarparadeshi). Licence: Unknown (see Kaggle page)." },
      { en: "Sugarcane leaf disease dataset — Sugarcane Leaf Disease Dataset (Kaggle, nirmalsankalana). Licence: CC0.", sw: "Sugarcane leaf disease dataset — Sugarcane Leaf Disease Dataset (Kaggle, nirmalsankalana). Licence: CC0." },
      { en: "teaLeafBD tea leaf diseases and pests (Bangladesh) — teaLeafBD: Tea Leaf Disease Detection (Kaggle, bmshahriaalam). Licence: CC BY-SA 4.0.", sw: "teaLeafBD tea leaf diseases and pests (Bangladesh) — teaLeafBD: Tea Leaf Disease Detection (Kaggle, bmshahriaalam). Licence: CC BY-SA 4.0." },
      { en: "Tea sickness dataset (8 classes) — Tea sickness dataset (Kaggle, shashwatwork: Identifying Disease in Tea leaves). Licence: CC BY-SA 4.0.", sw: "Tea sickness dataset (8 classes) — Tea sickness dataset (Kaggle, shashwatwork: Identifying Disease in Tea leaves). Licence: CC BY-SA 4.0." },
      { en: "Maize Imagery Dataset - Tanzania (NM-AIST/TARI): healthy, MLN, MSV — Mduma & Laizer (2023), Data in Brief 48:109108, doi:10.17632/fkw49mz3xs.1. Licence: CC BY 4.0.", sw: "Maize Imagery Dataset - Tanzania (NM-AIST/TARI): healthy, MLN, MSV — Mduma & Laizer (2023), Data in Brief 48:109108, doi:10.17632/fkw49mz3xs.1. Licence: CC BY 4.0." },
      { en: "CGIAR Computer Vision for Crop Disease: wheat rusts — CGIAR Computer Vision for Crop Disease, ICLR 2020 CV4A workshop challenge. Licence: Unknown on Kaggle (ICLR 2020 CV4A challenge data).", sw: "CGIAR Computer Vision for Crop Disease: wheat rusts — CGIAR Computer Vision for Crop Disease, ICLR 2020 CV4A workshop challenge. Licence: Unknown on Kaggle (ICLR 2020 CV4A challenge data)." },
      { en: "Wheat leaf dataset (Ethiopia): healthy, septoria, stripe rust — Wheat Leaf dataset (Kaggle, olyadgetch). Licence: Data files (c) original authors.", sw: "Wheat leaf dataset (Ethiopia): healthy, septoria, stripe rust — Wheat Leaf dataset (Kaggle, olyadgetch). Licence: Data files (c) original authors." },
      {
        en: 'Animated emoji: Noto Animated Emoji by Google, licensed CC BY 4.0 (googlefonts.github.io/noto-emoji-animation).',
        sw: 'Emoji zinazosonga: Noto Animated Emoji za Google, leseni CC BY 4.0 (googlefonts.github.io/noto-emoji-animation).',
      },
      {
        en: 'Pesticide products: the Pest Control Products Board register of crop products (pcpb.go.ke, list of 24 Aug 2026) and the PCPB-approved labels it links to. A dose is shown only when we read it on the label.',
        sw: 'Bidhaa za viuatilifu: orodha ya PCPB ya bidhaa za mazao (pcpb.go.ke, orodha ya 24 Agosti 2026) na vibandiko vilivyoidhinishwa na PCPB vilivyounganishwa nayo. Kipimo kinaonyeshwa tu tukikisoma kwenye kibandiko.',
      },
    ],
  },
];

export default function MethodologyScreen() {
  const { lang } = useLang();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="How Tassel works" subtitle="Methods, limits and sources" />
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
