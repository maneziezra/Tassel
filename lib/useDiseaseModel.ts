// Tassel — loads the on-device disease model, in the debug build and in the release APK.
//
// useTensorflowModel(require(...)) only worked in the debug build, where Metro serves the model
// over http. In the release APK the bundled model is an Android resource ("assets_model_cropguard"),
// and react-native-fast-tflite reads it with java.net.URL, so it failed with
// "MalformedURLException: no protocol" and the scanner said "The disease model failed to load"
// (found on the TECNO, 29 Oct 2026). expo-asset copies the bundled file to the phone's storage and
// gives a file:// URL, which the library can read, online or offline.

import { useEffect, useState } from 'react';
import { Asset } from 'expo-asset';
import { loadTensorflowModel, type TensorflowPlugin, type TfliteModel } from 'react-native-fast-tflite';

const MODEL = require('../assets/model/cropguard.tflite');

// One load per app run: the scan tab can remount, the model file is ~5 MB.
let loading: Promise<TfliteModel> | null = null;

async function load(): Promise<TfliteModel> {
  const asset = Asset.fromModule(MODEL);
  await asset.downloadAsync();
  const url = asset.localUri ?? asset.uri;
  return loadTensorflowModel({ url }, []);
}

export function useDiseaseModel(): TensorflowPlugin {
  const [state, setState] = useState<TensorflowPlugin>({ model: undefined, state: 'loading' });
  useEffect(() => {
    let live = true;
    loading ??= load();
    loading
      .then((model) => live && setState({ model, state: 'loaded' }))
      .catch((e) => {
        loading = null; // allow a retry the next time the scanner opens
        console.error('Could not load the disease model', e);
        if (live) setState({ model: undefined, state: 'error', error: e as Error });
      });
    return () => {
      live = false;
    };
  }, []);
  return state;
}
