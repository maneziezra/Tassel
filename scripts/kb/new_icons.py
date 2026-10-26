"""New crop icons for lib/cropArt.ts — 48x48, flat two-tone, shared leaf green #6E9B5A / #557F45."""
LEAF, LEAF_D, STEM = '#6E9B5A', '#557F45', '#7A5B3A'

ICONS = {
  'Coffee': f'''
<path d="M7 41C16 31 26 22 41 9" stroke="{STEM}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
<path d="M31 17c1-7 7-12 14-12-1 7-7 12-14 12z" fill="{LEAF}"/><path d="M31 17c4-4 9-8 14-12-1 7-7 12-14 12z" fill="{LEAF_D}"/>
<path d="M14 33c-7 0-11-5-11-12 7 0 11 5 11 12z" fill="{LEAF}"/><path d="M14 33c-4-4-8-8-11-12 7 0 11 5 11 12z" fill="{LEAF_D}"/>
<g fill="#983339"><ellipse cx="20" cy="30" rx="4.6" ry="5.2"/><ellipse cx="29" cy="25.5" rx="4.6" ry="5.2"/><ellipse cx="25.5" cy="36.5" rx="4.6" ry="5.2"/></g>
<g fill="#B8434A"><ellipse cx="20.8" cy="29.2" rx="3.8" ry="4.4"/><ellipse cx="29.8" cy="24.7" rx="3.8" ry="4.4"/><ellipse cx="26.3" cy="35.7" rx="3.8" ry="4.4"/></g>
<g fill="#D97B80"><circle cx="22.4" cy="27.4" r="1.2"/><circle cx="31.4" cy="22.9" r="1.2"/><circle cx="27.9" cy="33.9" r="1.2"/></g>''',

  'Tea': f'''
<path d="M24 45V15" stroke="{LEAF_D}" stroke-width="2.4" stroke-linecap="round"/>
<path d="M24 17c-3.4-4-3.4-9.6 0-13 3.4 3.4 3.4 9 0 13z" fill="#9CC48A"/>
<path d="M24 27c-8 1-14-4-16-12 8-1 15 4 16 12z" fill="#4F7D5A"/><path d="M24 27c-5-3-11-7-16-12 8-1 15 4 16 12z" fill="#3F6A49"/>
<path d="M24 37c8 1 14-4 16-12-8-1-15 4-16 12z" fill="#4F7D5A"/><path d="M24 37c5-3 11-7 16-12-8-1-15 4-16 12z" fill="#3F6A49"/>
<path d="M24 27c-4-3-8-6-11-9M24 37c4-3 8-6 11-9" stroke="#7FAA86" stroke-width="1.2" stroke-linecap="round" fill="none"/>''',

  'Rice': f'''
<path d="M19 45c-1-12 3-23 12-31" stroke="#B9A15E" stroke-width="2.2" stroke-linecap="round" fill="none"/>
<path d="M31 14c4 3 6 9 5 19" stroke="#C49A48" stroke-width="1.6" stroke-linecap="round" fill="none"/>
<g fill="#D8B25E">
<ellipse cx="34.6" cy="17.6" rx="1.9" ry="3.3" transform="rotate(-35 34.6 17.6)"/><ellipse cx="37.2" cy="22.4" rx="1.9" ry="3.3" transform="rotate(-15 37.2 22.4)"/>
<ellipse cx="38" cy="27.6" rx="1.9" ry="3.3"/><ellipse cx="37.4" cy="32.8" rx="1.9" ry="3.3" transform="rotate(10 37.4 32.8)"/>
<ellipse cx="31.6" cy="20.4" rx="1.9" ry="3.3" transform="rotate(15 31.6 20.4)"/><ellipse cx="32.6" cy="25.8" rx="1.9" ry="3.3" transform="rotate(10 32.6 25.8)"/>
<ellipse cx="33" cy="31" rx="1.9" ry="3.3" transform="rotate(5 33 31)"/><ellipse cx="35.6" cy="37.2" rx="1.8" ry="3" transform="rotate(10 35.6 37.2)"/></g>
<path d="M19 45c-2-9-6-15-13-19 7 1 12 7 13 19z" fill="{LEAF}"/><path d="M20 45c2-8 6-13 13-16-5 4-9 9-13 16z" fill="{LEAF_D}"/>''',

  'Sorghum': f'''
<path d="M24 45V20" stroke="#B9A15E" stroke-width="2.4" stroke-linecap="round"/>
<g fill="#94503A"><circle cx="20" cy="11" r="3.2"/><circle cx="20" cy="17" r="3.2"/><circle cx="24" cy="21" r="3.2"/><circle cx="21" cy="6" r="3"/></g>
<g fill="#B5654A"><circle cx="24" cy="5" r="3.2"/><circle cx="27" cy="9" r="3.2"/><circle cx="24" cy="12" r="3.2"/><circle cx="28" cy="15" r="3.2"/><circle cx="24" cy="18" r="3.2"/><circle cx="27.4" cy="20.4" r="2.8"/></g>
<g fill="#D08A70"><circle cx="25.4" cy="3.8" r="1"/><circle cx="28.4" cy="7.8" r="1"/><circle cx="29.4" cy="13.8" r="1"/></g>
<path d="M24 33c-7-1-12-5-15-12 7 0 12 4 15 12z" fill="{LEAF}"/><path d="M24 40c7-1 12-5 15-12-7 0-12 4-15 12z" fill="{LEAF_D}"/>''',

  'Millet': f'''
<path d="M24 45V26" stroke="#B9A15E" stroke-width="2.4" stroke-linecap="round"/>
<rect x="19" y="3" width="10" height="26" rx="5" fill="#C9A26E"/>
<path d="M24 3c-2.8 0-5 2.2-5 5v16c0 2.8 2.2 5 5 5z" fill="#A9824F"/>
<g fill="#DDBE8E"><circle cx="26.4" cy="8" r="1"/><circle cx="26.4" cy="13" r="1"/><circle cx="26.4" cy="18" r="1"/><circle cx="26.4" cy="23" r="1"/><circle cx="21.6" cy="10.5" r="1" fill="#C9A26E"/><circle cx="21.6" cy="15.5" r="1" fill="#C9A26E"/><circle cx="21.6" cy="20.5" r="1" fill="#C9A26E"/></g>
<path d="M24 37c-7 0-12-4-15-10 7 0 12 3 15 10z" fill="{LEAF}"/><path d="M24 42c7-1 11-5 14-11-6 1-11 4-14 11z" fill="{LEAF_D}"/>''',

  'Sugarcane': f'''
<path d="M17 45V17" stroke="#9AA052" stroke-width="6" stroke-linecap="round"/>
<path d="M29 45V12" stroke="#B4BA66" stroke-width="6" stroke-linecap="round"/>
<path d="M14 25h6M14 33h6M14 41h6M26 20h6M26 28h6M26 36h6" stroke="#7B8040" stroke-width="1.6"/>
<path d="M17 17c-4-4-9-6-14-5 4 3 9 5 14 5z" fill="{LEAF}"/><path d="M17 17c2-4 6-6 10-6-3 2-6 4-10 6z" fill="{LEAF_D}"/>
<path d="M29 12c3-5 9-8 15-7-4 4-9 6-15 7z" fill="{LEAF}"/><path d="M29 12c-2-4-6-7-11-8 3 3 7 6 11 8z" fill="{LEAF_D}"/>''',

  'Mango': f'''
<path d="M30 11c8 3 11 12 8 21-3 8-11 12-19 11-7-1-11-7-9-13 2-5 7-6 11-9 4-3 4-8 9-10z" fill="#E9B04A"/>
<path d="M19 43c-7-1-11-7-9-13 1-3 3-4.6 5.4-6C13 28 12.6 32 13.6 35.4 14.8 39.4 16.6 41.6 19 43z" fill="#D0923A"/>
<path d="M30 11c6 2 9 7 9 13-3-4-7-6-11-6 1-2 1-5 2-7z" fill="#E07A45"/>
<ellipse cx="33.5" cy="23" rx="1.8" ry="3" fill="#F2CD7E" transform="rotate(25 33.5 23)"/>
<path d="M30 11c0-2.4 1-4.4 3-5.6" stroke="{STEM}" stroke-width="2" stroke-linecap="round" fill="none"/>
<path d="M32 6c3-4 9-5 14-3-3 4-9 5-14 3z" fill="{LEAF}"/><path d="M32 6c4-1 9-2 14-3-3 4-9 5-14 3z" fill="{LEAF_D}"/>''',

  'Cashew': f'''
<path d="M24 9V4" stroke="{STEM}" stroke-width="2" stroke-linecap="round"/>
<path d="M25 6c3-3 8-3 11-1-3 3-8 3-11 1z" fill="{LEAF}"/>
<path d="M15 10c5-3 13-3 18 0 3 5 2 12-1 17-2 3-6 5-8 5s-6-2-8-5c-3-5-4-12-1-17z" fill="#E07A45"/>
<path d="M24 32c-2 0-6-2-8-5-3-5-4-12-1-17 1.5-.9 3.1-1.5 4.8-1.9C17.4 13 17 19 18.6 24c1.2 3.6 3.2 6.4 5.4 8z" fill="#C4603A"/>
<ellipse cx="28.6" cy="15" rx="2.2" ry="3.6" fill="#EFA073" transform="rotate(20 28.6 15)"/>
<path d="M17 34c0 6 5 10 11 9 4-1 6-5 3-6.4-2-.8-4 .6-6-.4s-3-4.4-8-2.2z" fill="#A08A6A"/>
<path d="M17 34c0 6 5 10 11 9-5-1.6-8.4-4.6-9.4-9.8z" fill="#84704F"/>''',

  'Cotton': f'''
<path d="M24 42v4" stroke="{STEM}" stroke-width="2.2" stroke-linecap="round"/>
<path d="M9 31c4 7 9 11 15 11s11-4 15-11c-5 2-10 3-15 3s-10-1-15-3z" fill="#8C6A3E"/>
<path d="M9 31l-2 6 6-2zM39 31l2 6-6-2z" fill="#7A5B3A"/>
<g fill="#D9D2C2"><circle cx="16" cy="24" r="8"/><circle cx="32" cy="24" r="8"/><circle cx="24" cy="15" r="8"/><circle cx="24" cy="29" r="7"/></g>
<g fill="#F4F0E7"><circle cx="17" cy="23" r="6.6"/><circle cx="33" cy="23" r="6.6"/><circle cx="25" cy="14" r="6.6"/><circle cx="25" cy="28" r="5.6"/></g>
<path d="M18 21c2-2 5-2 6 0M30 21c2-2 5-2 6 0M22 12c2-2 5-2 6 0" stroke="#E6E0D3" stroke-width="1.2" stroke-linecap="round" fill="none"/>''',

  'Cucumber': f'''
<path d="M12 39c-3-3-2-8 2-12l14-14c4-4 9-5 12-2s2 8-2 12L24 37c-4 4-9 5-12 2z" fill="#5E9150"/>
<path d="M12 39c-3-3-2-8 2-12l14-14c2-2 4.4-3 6.6-3.2L16.6 28c-3 3-4.8 7-4.6 11z" fill="#4A7840"/>
<path d="M19 31l12-12M23 33l11-11" stroke="#86B276" stroke-width="1.4" stroke-linecap="round"/>
<g fill="#3E6435"><circle cx="21" cy="26" r=".9"/><circle cx="28" cy="20" r=".9"/><circle cx="27" cy="28" r=".9"/><circle cx="33" cy="23" r=".9"/><circle cx="17" cy="33" r=".9"/></g>
<path d="M38 11l3.4-3.4" stroke="{STEM}" stroke-width="2.4" stroke-linecap="round"/>
<path d="M40 8c1-3 4-5 7-4-1 3-4 5-7 4z" fill="#E2B64A"/>''',

  'Pumpkin': f'''
<path d="M24 15c-3-2-9-2-13 1-5 4-6 12-3 18 3 5 8 8 16 8s13-3 16-8c3-6 2-14-3-18-4-3-10-3-13-1z" fill="#E08A3C"/>
<path d="M24 42c-8 0-13-3-16-8-3-6-2-14 3-18 1.6-1.2 3.6-1.9 5.6-2.2C13 17 11 23 12 29c1 6 5.6 11 12 13z" fill="#C4702C"/>
<path d="M24 16c-4 5-5 17 0 26M24 16c4 5 5 17 0 26M31 15c4 6 4 19-1 26" stroke="#C4702C" stroke-width="1.4" fill="none"/>
<ellipse cx="33" cy="22" rx="1.8" ry="3.4" fill="#EDAE6E" transform="rotate(-15 33 22)"/>
<path d="M24 16c0-4 1-7 4-9" stroke="{STEM}" stroke-width="3" stroke-linecap="round" fill="none"/>
<path d="M27 9c3-4 9-5 13-2-4 3-9 4-13 2z" fill="{LEAF}"/>''',

  'Eggplant': f'''
<path d="M30 16c6 2 10 8 9 15-1 8-8 13-15 12-8-1-13-8-11-15 1-5 5-6 9-8 3-2 5-5 8-4z" fill="#6B4A7E"/>
<path d="M24 43c-8-1-13-8-11-15 .8-2.8 2.4-4.4 4.4-5.6C15.6 26 15 30 16 34c1 4.4 4 7.6 8 9z" fill="#553A66"/>
<ellipse cx="33.5" cy="25" rx="2" ry="4.2" fill="#8E6FA2" transform="rotate(25 33.5 25)"/>
<path d="M21 19c2-5 7-7 11-6 3 1 5 3 6 6-3-1-5-1-7 .4-1-2-3-3-5-2.4-1.4.6-3 1.6-5 2z" fill="{LEAF}"/>
<path d="M31 13c1-3 3-5 6-6" stroke="{LEAF_D}" stroke-width="2.6" stroke-linecap="round" fill="none"/>''',

  'Olive': f'''
<path d="M7 39C17 31 27 21 41 7" stroke="{STEM}" stroke-width="2" stroke-linecap="round" fill="none"/>
<path d="M14 33c-3-6-8-9-13-9 3 5 8 8 13 9z" fill="#8FA27A"/>
<path d="M27 22c1-6 5-10 11-12-2 6-6 10-11 12z" fill="#8FA27A"/>
<path d="M35 14c-4-4-9-6-14-5 4 3 9 5 14 5z" fill="#71845E"/>
<path d="M20 30c-4-4-6-9-5-14 4 3 6 8 5 14z" fill="#71845E"/>
<path d="M23 31l-1-3M31 25l1-3" stroke="{STEM}" stroke-width="1.3" stroke-linecap="round"/>
<ellipse cx="22.6" cy="34.6" rx="4.2" ry="5.4" fill="#3F3E33" transform="rotate(-30 22.6 34.6)"/>
<ellipse cx="31.4" cy="28.6" rx="3.8" ry="5" fill="#7D8C45" transform="rotate(-30 31.4 28.6)"/>
<circle cx="24.4" cy="32.4" r="1.2" fill="#6E6C5A"/><circle cx="33" cy="26.6" r="1.1" fill="#A7B672"/>''',
}

# regex (lower-case crop name, English or Kiswahili) -> art key; inserted in this order before the generic rules
MATCH = [
  (r'coffee|kahawa', 'Coffee'),
  (r'\btea\b|chai', 'Tea'),
  (r'rice|mpunga|mchele', 'Rice'),
  (r'sorghum|mtama', 'Sorghum'),
  (r'millet|mawele|uwele|wimbi', 'Millet'),
  (r'sugar|miwa', 'Sugarcane'),
  (r'mango|embe', 'Mango'),
  (r'cashew|korosho', 'Cashew'),
  (r'cotton|pamba', 'Cotton'),
  (r'cucumber|tango', 'Cucumber'),
  (r'pumpkin|malenge', 'Pumpkin'),
  (r'eggplant|brinjal|biringanya', 'Eggplant'),
  (r'olive|zeituni', 'Olive'),
  (r'black gram|urad|dengu', 'Beans'),
  (r'citrus|lemon|lime|ndimu', 'Orange'),
]
