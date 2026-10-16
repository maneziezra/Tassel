import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

export default function MarketScreen() {
  const prices = [
    { crop: 'Tomatoes', price: 'Ksh 3,500', unit: 'per crate (64kg)', trend: 'up', change: '+5%' },
    { crop: 'Potatoes (Shangi)', price: 'Ksh 2,800', unit: 'per 50kg bag', trend: 'down', change: '-2%' },
    { crop: 'Maize (Dry)', price: 'Ksh 3,200', unit: 'per 90kg bag', trend: 'stable', change: '0%' },
    { crop: 'Capsicum (Hoho)', price: 'Ksh 1,200', unit: 'per 10kg net', trend: 'up', change: '+12%' },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-green-800 px-4 pt-12 pb-6">
        <Text className="text-2xl font-black text-white mb-1">Market Prices</Text>
        <Text className="text-green-200 text-sm flex-row items-center">
          <FontAwesome5 name="map-marker-alt" size={12} /> Wakulima Market, Nairobi
        </Text>
      </View>

      <ScrollView className="flex-1 p-4 -mt-4">
        {/* Date Card */}
        <View className="bg-white rounded-xl p-3 mb-6 shadow-sm flex-row justify-between items-center border border-gray-100">
          <Text className="text-gray-500 font-medium">Updated: Today, 06:00 AM</Text>
          <TouchableOpacity>
            <Text className="text-green-700 font-bold">Change Market</Text>
          </TouchableOpacity>
        </View>

        {/* Price List */}
        {prices.map(item => (
          <View key={item.crop} className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
            <View className="flex-row justify-between items-start mb-2">
              <View>
                <Text className="text-lg font-bold text-gray-800">{item.crop}</Text>
                <Text className="text-gray-500">{item.unit}</Text>
              </View>
              <View className="items-end">
                <Text className="text-xl font-black text-gray-900">{item.price}</Text>
                <View className={`flex-row items-center mt-1 px-2 py-1 rounded ${
                  item.trend === 'up' ? 'bg-red-100' : item.trend === 'down' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <FontAwesome5 
                    name={item.trend === 'up' ? 'arrow-up' : item.trend === 'down' ? 'arrow-down' : 'minus'} 
                    size={10} 
                    color={item.trend === 'up' ? '#DC2626' : item.trend === 'down' ? '#16A34A' : '#4B5563'} 
                    className="mr-1"
                  />
                  <Text className={`text-xs font-bold ${
                    item.trend === 'up' ? 'text-red-700' : item.trend === 'down' ? 'text-green-700' : 'text-gray-700'
                  }`}>
                    {item.change}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity className="mt-4 bg-green-50 py-4 rounded-xl border border-green-200 items-center border-dashed">
          <Text className="text-green-700 font-bold">Add Custom Crop Alert</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
