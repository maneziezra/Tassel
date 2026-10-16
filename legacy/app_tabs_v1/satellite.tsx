import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

export default function SatelliteScreen() {
  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-slate-900 px-4 pt-12 pb-6 flex-row justify-between items-center">
        <View>
          <Text className="text-2xl font-black text-white mb-1">Satellite Intelligence</Text>
          <Text className="text-slate-300 text-sm flex-row items-center">
            <FontAwesome5 name="map-marker-alt" size={12} /> North Field (2.4 Acres)
          </Text>
        </View>
        <View className="bg-green-500/20 border border-green-500 px-3 py-1 rounded-full flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
          <Text className="text-green-400 font-bold text-xs">Healthy</Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        
        {/* Metrics Grid */}
        <View className="flex-row flex-wrap justify-between mb-6">
          {/* NDVI Card */}
          <View className="bg-white w-[48%] p-4 rounded-xl shadow-sm border border-gray-100 mb-3">
            <View className="flex-row items-center mb-2">
              <FontAwesome5 name="leaf" size={14} color="#10B981" className="mr-2" />
              <Text className="text-gray-500 text-xs font-bold uppercase">NDVI</Text>
            </View>
            <Text className="text-2xl font-black text-emerald-600 mb-1">0.82</Text>
            <Text className="text-emerald-600 text-xs font-bold">+12% vs last week</Text>
          </View>

          {/* NDWI Card */}
          <View className="bg-white w-[48%] p-4 rounded-xl shadow-sm border border-gray-100 mb-3">
            <View className="flex-row items-center mb-2">
              <FontAwesome5 name="tint" size={14} color="#3B82F6" className="mr-2" />
              <Text className="text-gray-500 text-xs font-bold uppercase">NDWI</Text>
            </View>
            <Text className="text-2xl font-black text-blue-500 mb-1">0.45</Text>
            <Text className="text-blue-500 text-xs font-bold">Optimal moisture</Text>
          </View>

          {/* Yield Forecast Card */}
          <View className="bg-white w-[48%] p-4 rounded-xl shadow-sm border border-gray-100">
            <View className="flex-row items-center mb-2">
              <FontAwesome5 name="chart-bar" size={14} color="#8B5CF6" className="mr-2" />
              <Text className="text-gray-500 text-xs font-bold uppercase">Yield Forecast</Text>
            </View>
            <Text className="text-2xl font-black text-purple-500 mb-1">+18%</Text>
            <Text className="text-purple-500 text-xs font-bold">Above average</Text>
          </View>

          {/* Alerts Card */}
          <View className="bg-white w-[48%] p-4 rounded-xl shadow-sm border border-gray-100">
            <View className="flex-row items-center mb-2">
              <FontAwesome5 name="bell" size={14} color="#F59E0B" className="mr-2" />
              <Text className="text-gray-500 text-xs font-bold uppercase">Alerts</Text>
            </View>
            <Text className="text-2xl font-black text-amber-500 mb-1">2</Text>
            <Text className="text-red-500 text-xs font-bold">Action needed</Text>
          </View>
        </View>

        {/* Map Placeholder */}
        <View className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
          <View className="h-48 bg-slate-200 justify-center items-center relative">
             <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80' }}
                className="absolute w-full h-full opacity-80"
                resizeMode="cover"
             />
             <View className="absolute inset-0 bg-blue-900/20" />
             <View className="bg-white/90 px-4 py-2 rounded-full absolute">
                <Text className="text-slate-800 font-bold text-sm">Live Sentinel-2 Imagery</Text>
             </View>
          </View>
          <View className="p-3 bg-white border-t border-gray-100 flex-row justify-between items-center">
             <Text className="text-xs text-gray-500">Updated: Today, 14:30 EAT</Text>
             <TouchableOpacity>
               <Text className="text-emerald-600 font-bold text-xs">View Full Screen</Text>
             </TouchableOpacity>
          </View>
        </View>

        {/* AI Decision Engine Alert Card */}
        <View className="bg-white rounded-xl shadow-sm border border-amber-200 mb-8 overflow-hidden">
          {/* Top colored line */}
          <View className="h-1 bg-amber-500" />
          
          <View className="p-4 border-b border-gray-100 flex-row justify-between items-center">
            <View className="flex-row items-center">
               <FontAwesome5 name="robot" size={16} color="#F59E0B" className="mr-2" />
               <Text className="font-bold text-slate-800">AI Diagnosis</Text>
            </View>
            <View className="bg-amber-100 px-2 py-1 rounded">
               <Text className="text-amber-700 text-xs font-bold">Medium Priority</Text>
            </View>
          </View>

          <View className="p-4 bg-amber-50/50">
            <Text className="font-semibold text-slate-800 mb-1">
              "North-west section of the farm is showing early crop stress."
            </Text>
            <Text className="text-xs text-slate-500 mb-4">
              Detected via Sentinel-2 NDVI anomaly
            </Text>

            <Text className="font-bold text-sm text-slate-700 mb-2">Possible Causes:</Text>
            
            {/* Cause 1 */}
            <View className="flex-row items-center mb-2">
               <Text className="text-xs text-slate-600 w-24">Water deficiency</Text>
               <View className="flex-1 h-4 bg-slate-200 rounded-full mx-2 overflow-hidden">
                 <View className="h-full bg-amber-500 w-[72%]" />
               </View>
               <Text className="text-xs font-bold text-slate-700 w-8 text-right">72%</Text>
            </View>
            
            {/* Cause 2 */}
            <View className="flex-row items-center mb-2">
               <Text className="text-xs text-slate-600 w-24">Nitrogen issue</Text>
               <View className="flex-1 h-4 bg-slate-200 rounded-full mx-2 overflow-hidden">
                 <View className="h-full bg-blue-500 w-[18%]" />
               </View>
               <Text className="text-xs font-bold text-slate-700 w-8 text-right">18%</Text>
            </View>

            {/* Cause 3 */}
            <View className="flex-row items-center mb-4">
               <Text className="text-xs text-slate-600 w-24">Early disease</Text>
               <View className="flex-1 h-4 bg-slate-200 rounded-full mx-2 overflow-hidden">
                 <View className="h-full bg-purple-500 w-[10%]" />
               </View>
               <Text className="text-xs font-bold text-slate-700 w-8 text-right">10%</Text>
            </View>

            {/* Recommendations */}
            <View className="pt-3 border-t border-amber-200/50">
               <Text className="font-bold text-sm text-emerald-700 mb-2">
                 <FontAwesome5 name="check-circle" size={12} color="#047857" className="mr-1" /> Recommended Actions
               </Text>
               <View className="flex-row items-start mb-1">
                 <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 mr-2" />
                 <Text className="text-xs text-slate-600 flex-1">Inspect affected zone immediately</Text>
               </View>
               <View className="flex-row items-start mb-1">
                 <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 mr-2" />
                 <Text className="text-xs text-slate-600 flex-1">Capture a plant image for AI disease analysis</Text>
               </View>
               <View className="flex-row items-start">
                 <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 mr-2" />
                 <Text className="text-xs text-slate-600 flex-1">Apply irrigation if soil moisture is below threshold</Text>
               </View>
            </View>

          </View>
        </View>

      </ScrollView>
    </View>
  );
}
