"""Helpers for the Tassel v5 knowledge base. Chemical items:
  "COPPER" / "MANCOZEB"           -> the shared constants in each language file
  ("Active",)                     -> active ingredient, no note
  ("Active", "note en", "note sw")-> with a note in both languages
"""
ENTRIES = []

def E(label, crop, kind, urgency, pathogen, en, sw, chem, notifiable=False):
    ENTRIES.append(dict(label=label, crop=crop, kind=kind, urgency=urgency, pathogen=pathogen,
                        en=en, sw=sw, chem=chem, notifiable=notifiable))

def H(label, crop, en_tips, sw_tips):
    ENTRIES.append(dict(label=label, crop=crop, kind="Healthy", healthy=True, en_tips=en_tips, sw_tips=sw_tips))

def T(disease, symptoms, spread, kenya, cultural, biological=(), pathogen=None):
    return dict(disease=disease, symptoms=symptoms, spread=spread, kenya=kenya,
                cultural=list(cultural), biological=list(biological), pathogen=pathogen)
