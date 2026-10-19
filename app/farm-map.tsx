// Farm map — v1.0 FarmMapScreen (satellite/street toggle, field polygons, draw
// mode with undo, GPS, field cards). v1.0 used react-native-maps (needs a Google
// key) and saved every new field as "1.2 acres, 100% health". v2.0 uses Leaflet
// with free Esri satellite / OpenStreetMap tiles and calculates the real area of
// the drawn boundary.

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header, Icon, Text } from '../components/ui';
import { tr, useLang } from '../lib/i18n';
import { listFarms, updateFarm, type Farm, type LatLng } from '../lib/data';
import { centroid, getPosition, polygonAcres } from '../lib/geo';
import { C, SHADOW } from '../lib/theme';
import { CLASSES, getGrid } from '../lib/satellite';

const HTML = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{height:100%;margin:0;background:#F4F2EC}
.lbl{background:rgba(31,77,57,.92);color:#fff;border:0;border-radius:8px;font:700 12px sans-serif;padding:2px 6px;box-shadow:none}
.lbl:before{display:none}
.px{image-rendering:pixelated;image-rendering:crisp-edges}</style></head><body><div id="map"></div><script>
var send=function(o){window.ReactNativeWebView.postMessage(JSON.stringify(o))};
var map=L.map('map',{zoomControl:false,attributionControl:true,maxZoom:21,bounceAtZoomLimits:false,zoomSnap:0.5}).setView([-0.6,37.0],7);
var sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:21,maxNativeZoom:18,attribution:'Imagery © Esri, Maxar, Earthstar Geographics'});
var street=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:21,maxNativeZoom:19,attribution:'© OpenStreetMap contributors'});
sat.addTo(map);
var farmsLayer=L.layerGroup().addTo(map), drawLayer=L.layerGroup().addTo(map), me=null, mode='view', pts=[];
function redraw(){drawLayer.clearLayers();
 pts.forEach(function(p){L.circleMarker(p,{radius:6,color:'#fff',weight:2,fillColor:'#E8C25A',fillOpacity:1}).addTo(drawLayer)});
 if(pts.length>1)L.polygon(pts,{color:'#E8C25A',weight:3,fillOpacity:.25,dashArray:pts.length<3?'6':null}).addTo(drawLayer);
 send({type:'points',points:pts});}
map.on('click',function(e){if(mode!=='draw')return;pts.push([e.latlng.lat,e.latlng.lng]);redraw();});
window.cg={
 setFarms:function(list,fit,outline){farmsLayer.clearLayers();var b=[];
  list.forEach(function(f){
   if(f.polygon&&f.polygon.length>2){var pg=L.polygon(f.polygon,{color:outline?'#fff':f.color,weight:outline?2:3,dashArray:outline?'5,4':null,fillOpacity:outline?0:.3}).addTo(farmsLayer);
    if(!outline)pg.bindTooltip(f.label,{permanent:true,direction:'center',className:'lbl'});pg.on('click',function(){send({type:'farm',id:f.id})});b=b.concat(f.polygon);}
   else if(f.center){var m=L.circleMarker(f.center,{radius:9,color:'#fff',weight:2,fillColor:f.color,fillOpacity:1}).addTo(farmsLayer);
    m.bindTooltip(f.label,{direction:'top',className:'lbl'});m.on('click',function(){send({type:'farm',id:f.id})});b.push(f.center);}
  });
  if(fit&&b.length)map.fitBounds(b,{padding:[40,40],maxZoom:19});},
 setMode:function(m){mode=m;if(m!=='draw'){pts=[];}redraw();},
 undo:function(){pts.pop();redraw();},
 clear:function(){pts=[];redraw();},
 base:function(b){if(b==='sat'){map.removeLayer(street);sat.addTo(map);}else{map.removeLayer(sat);street.addTo(map);}},
 locate:function(lat,lng){if(me)map.removeLayer(me);me=L.circleMarker([lat,lng],{radius:8,color:'#fff',weight:3,fillColor:'#24609B',fillOpacity:1}).addTo(map);map.setView([lat,lng],17);},
 focus:function(poly){if(poly&&poly.length)map.fitBounds(poly,{padding:[40,40],maxZoom:19});},
 overlay:function(g,colors,op){if(window._ov)map.removeLayer(window._ov);var c=document.createElement('canvas');c.width=g.w;c.height=g.h;var x=c.getContext('2d');
  for(var r=0;r<g.h;r++)for(var k=0;k<g.w;k++){var v=g.cls[r*g.w+k];if(v===255)continue;x.globalAlpha=v===0?0.35:1;x.fillStyle=colors[v];x.fillRect(k,r,1,1);}
  window._ov=L.imageOverlay(c.toDataURL(),g.bounds,{opacity:op,className:'px',interactive:false}).addTo(map);var fit=function(){map.invalidateSize();map.fitBounds(g.bounds,{padding:[40,40],maxZoom:20});};fit();setTimeout(fit,400);setTimeout(fit,1200);},
 opacity:function(o){if(window._ov)window._ov.setOpacity(o);}
};
send({type:'ready'});
</script></body></html>`;

function healthColor(_f: Farm) {
  return '#8FC2A5'; // light forest green: readable on dark satellite ground
}

// Leaflet tooltips render HTML, so escape user-entered field names.
const esc = (t: string) => t.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string);

export default function FarmMapScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  const { farmId, sat, focus } = useLocalSearchParams<{ farmId?: string; sat?: string; focus?: string }>();
  const [satOpacity, setSatOpacity] = useState(0.8);
  const [satDate, setSatDate] = useState<string | null>(null);
  const web = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [drawing, setDrawing] = useState(Boolean(farmId));
  const [points, setPoints] = useState<LatLng[]>([]);
  const [base, setBase] = useState<'sat' | 'street'>('sat');
  const [saving, setSaving] = useState(false);
  const editFarm = farms.find((f) => f.id === farmId);

  const js = (code: string) => web.current?.injectJavaScript(`${code};true;`);

  const pushFarms = useCallback(
    (list: Farm[], fit: boolean) => {
      const data = list.map((f) => ({
        id: f.id,
        label: esc(f.name),
        color: healthColor(f),
        polygon: f.polygon,
        center: f.center_lat != null && f.center_lng != null ? [f.center_lat, f.center_lng] : null,
      }));
      js(`window.cg.setFarms(${JSON.stringify(data)}, ${fit && !sat}, ${sat ? 'true' : 'false'})`);
    },
    [sat]
  );

  const load = useCallback(async () => {
    try {
      const list = await listFarms();
      setFarms(list);
      if (ready) pushFarms(list, true);
    } catch (e) {
      Alert.alert(tr('Could not load fields'), e instanceof Error ? e.message : '');
    }
  }, [ready, pushFarms]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'ready') {
        setReady(true);
        pushFarms(farms, true);
        if (drawing) js(`window.cg.setMode('draw')`);
        if (sat) {
          getGrid(Number(sat)).then((g) => {
            if (!g) return;
            // the joint stress mask is a 20 m product: drawn as its own 20 m cells
            const m = g.grid20;
            js(`window.cg.overlay(${JSON.stringify({ w: m.w, h: m.h, cls: m.cls, bounds: m.bounds })}, ${JSON.stringify(CLASSES.map((c) => c.color))}, ${satOpacity})`);
            setSatDate('ok');
          });
        } else if (focus) {
          const f = farms.find((x) => x.id === focus);
          if (f?.polygon) js(`window.cg.focus(${JSON.stringify(f.polygon)})`);
        } else if (!farms.some((f) => f.polygon || f.center_lat != null)) locate(true);
      } else if (msg.type === 'points') {
        setPoints(msg.points);
      } else if (msg.type === 'farm') {
        router.push({ pathname: '/farm/[id]', params: { id: msg.id } });
      }
    } catch {
      // ignore
    }
  };

  const locate = async (quiet = false) => {
    const pos = await getPosition();
    if (pos) js(`window.cg.locate(${pos.lat}, ${pos.lng})`);
    else if (!quiet) Alert.alert(tr('Location off'), tr('Allow location to centre the map on your farm.'));
  };

  const startDraw = () => {
    setDrawing(true);
    setPoints([]);
    js(`window.cg.setMode('draw')`);
    locate(true);
  };
  const cancelDraw = () => {
    setDrawing(false);
    setPoints([]);
    js(`window.cg.setMode('view')`);
    if (farmId) router.back();
  };

  const acres = useMemo(() => polygonAcres(points), [points]);

  const saveDraw = async () => {
    if (points.length < 3) {
      Alert.alert(tr('Need more points'), tr('Tap at least 3 corners of the field on the map.'));
      return;
    }
    const c = centroid(points)!;
    if (farmId) {
      setSaving(true);
      try {
        await updateFarm(farmId, { polygon: points, size_acres: Number(acres.toFixed(3)), center_lat: c.lat, center_lng: c.lng });
        router.back();
      } catch (e) {
        Alert.alert(tr('Could not save'), e instanceof Error ? e.message : '');
      } finally {
        setSaving(false);
      }
      return;
    }
    setDrawing(false);
    js(`window.cg.setMode('view')`);
    router.push({ pathname: '/add-farm', params: { polygon: JSON.stringify(points), acres: acres.toFixed(3) } });
  };

  const toggleBase = () => {
    const next = base === 'sat' ? 'street' : 'sat';
    setBase(next);
    js(`window.cg.base('${next}')`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={drawing ? (editFarm ? t('Redraw: {name}', { name: editFarm.name }) : 'Draw a field') : 'Farm map'} subtitle={drawing ? 'Tap each corner of the field' : farms.length === 1 ? '1 field' : t('{n} fields', { n: farms.length })} />
      <View style={{ flex: 1 }}>
        <WebView
          ref={web}
          source={{ html: HTML }}
          originWhitelist={['*']}
          onMessage={onMessage}
          javaScriptEnabled
          style={{ flex: 1 }}
        />
        <View style={st.fabCol}>
          <TouchableOpacity style={st.fab} onPress={toggleBase} accessibilityLabel={t('Switch map type')}>
            <Icon name={base === 'sat' ? 'map-outline' : 'satellite-variant'} size={22} color={C.text} />
          </TouchableOpacity>
          <TouchableOpacity style={st.fab} onPress={() => locate()} accessibilityLabel={t('My location')}>
            <Icon name="crosshairs-gps" size={22} color={C.info} />
          </TouchableOpacity>
        </View>

        {sat ? (
          <View style={[st.satBar, { paddingBottom: insets.bottom + 12 }]}>
            <Text style={st.drawInfo}>{satDate ? 'Joint stress mask · 20 m effective resolution, drawn as 20 m squares' : 'Loading the satellite layer…'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
              {CLASSES.filter((c) => c.code !== 0).map((c) => (
                <View key={c.code} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c.color }} />
                  <Text style={st.fieldSub}>{c.short}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              {[0, 0.5, 0.8, 1].map((o) => (
                <TouchableOpacity key={o} onPress={() => { setSatOpacity(o); js(`window.cg.opacity(${o})`); }} style={[st.opBtn, satOpacity === o && { backgroundColor: C.primaryDark }]}>
                  <Text raw style={[st.drawBtnTxt, { color: satOpacity === o ? '#fff' : C.textMid }]}>{o === 0 ? t('Off') : `${Math.round(o * 100)}%`}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : drawing ? (
          <View style={[st.drawBar, { paddingBottom: insets.bottom + 12 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text raw style={st.drawInfo}>{points.length === 1 ? t('1 point') : t('{n} points', { n: points.length })}</Text>
              <Text raw style={st.drawArea}>{points.length >= 3 ? t('{a} acres ({h} ha)', { a: acres.toFixed(2), h: (acres * 0.404686).toFixed(2) }) : t('Area appears after 3 points')}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity style={[st.drawBtn, { backgroundColor: C.bg }]} onPress={cancelDraw}>
                <Text style={[st.drawBtnTxt, { color: C.textMid }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.drawBtn, { backgroundColor: C.sunken }]} onPress={() => js('window.cg.undo()')} disabled={!points.length}>
                <Icon name="undo" size={18} color={C.warn} />
                <Text style={[st.drawBtnTxt, { color: C.warn }]}>Undo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.drawBtn, { backgroundColor: C.primary, flex: 1.4, opacity: points.length < 3 || saving ? 0.5 : 1 }]} onPress={saveDraw} disabled={points.length < 3 || saving}>
                <Icon name="check" size={18} color="#fff" />
                <Text style={[st.drawBtnTxt, { color: '#fff' }]}>{farmId ? 'Save boundary' : 'Save field'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[st.sheet, { paddingBottom: insets.bottom + 12 }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
              <TouchableOpacity style={[st.fieldCard, st.addCard]} onPress={startDraw}>
                <Icon name="vector-polygon" size={26} color={C.primary} />
                <Text style={[st.fieldName, { color: C.primary }]}>Draw new field</Text>
              </TouchableOpacity>
              {farms.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={st.fieldCard}
                  onPress={() => (f.polygon ? js(`window.cg.focus(${JSON.stringify(f.polygon)})`) : router.push({ pathname: '/farm/[id]', params: { id: f.id } }))}
                  onLongPress={() => router.push({ pathname: '/farm/[id]', params: { id: f.id } })}
                >
                  <Text raw style={st.fieldName} numberOfLines={1}>{f.name}</Text>
                  <Text style={st.fieldSub}>{f.crop ?? 'Crop not set'}</Text>
                  <Text raw style={st.fieldSub}>{f.size_acres ? t('{n} acres', { n: Number(f.size_acres).toFixed(2) }) : t('No size')}</Text>
                  <Text style={[st.fieldSub, { color: f.polygon ? C.primary : C.warn, fontWeight: '700' }]}>{f.polygon ? 'Mapped' : 'Not mapped'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={st.hint}>Tap a field to zoom to it. Long-press to open it.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  fabCol: { position: 'absolute', right: 14, top: 14, gap: 10 },
  fab: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center', ...SHADOW, elevation: 6 },
  drawBar: { backgroundColor: C.surface, padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, ...SHADOW, elevation: 10 },
  drawInfo: { fontSize: 13, color: C.textSub, fontWeight: '700' },
  drawArea: { fontSize: 15, color: C.text, fontWeight: '900' },
  drawBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12 },
  drawBtnTxt: { fontWeight: '800', fontSize: 14 },
  sheet: { backgroundColor: C.surface, paddingTop: 14, borderTopLeftRadius: 20, borderTopRightRadius: 20, ...SHADOW, elevation: 10 },
  fieldCard: { width: 150, backgroundColor: C.bg, borderRadius: 14, padding: 12, gap: 2 },
  addCard: { justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.primary, backgroundColor: C.primaryTint, gap: 6 },
  fieldName: { fontSize: 14, fontWeight: '800', color: C.text },
  fieldSub: { fontSize: 12, color: C.textSub },
  hint: { fontSize: 11, color: C.textLight, textAlign: 'center', marginTop: 8 },
  satBar: { backgroundColor: C.surface, padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, ...SHADOW, elevation: 10 },
  opBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: C.sunken },
});
