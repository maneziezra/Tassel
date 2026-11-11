// Tassel — reading a model class name (no phone APIs, so the rules can be tested in Node).

export type LabelInfo = {
  label: string; // raw class name, e.g. "Tomato___Late_blight"
  crop: string; // "Tomato"
  disease: string; // "Late blight" or "Healthy"
  healthy: boolean;
};

/** "Corn_(maize)___Common_rust_" → { crop: "Maize", disease: "Common rust" } */
export function describeLabel(label: string): LabelInfo {
  const [rawCrop = label, rawDisease = ''] = label.split('___');
  const crop = rawCrop
    .replace('Corn_(maize)', 'Maize')
    .replace('Pepper,_bell', 'Pepper (capsicum)')
    .replace('Cherry_(including_sour)', 'Cherry')
    .replace(/_/g, ' ')
    .trim()
    .replace(/^Bean$/, 'Beans');
  const healthy = rawDisease.toLowerCase() === 'healthy';
  let disease = rawDisease
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Tidy a few PlantVillage names
  disease = disease
    .replace('Cercospora leaf spot Gray leaf spot', 'Grey leaf spot (Cercospora)')
    .replace('Spider mites Two-spotted spider mite', 'Spider mites')
    .replace('Haunglongbing (Citrus greening)', 'Citrus greening (HLB)');
  if (healthy) disease = 'Healthy';
  else disease = disease.charAt(0).toUpperCase() + disease.slice(1).toLowerCase();
  return { label, crop, disease, healthy };
}
