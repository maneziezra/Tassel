import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

export default function CommunityScreen() {
  const posts = [
    {
      id: '1',
      author: 'David Kiptoo',
      location: 'Eldoret, Uasin Gishu',
      time: '2 hours ago',
      content: 'Has anyone tried the new Ridomil Gold formulation for potato blight? I am seeing mixed results on my 2-acre plot.',
      tags: ['Potato', 'Fungicide', 'Blight'],
      likes: 14,
      comments: 5
    },
    {
      id: '2',
      author: 'Njeri Mwangi',
      location: 'Kiambu County',
      time: '5 hours ago',
      content: 'Warning to all greenhouse tomato farmers: Tuta Absoluta outbreaks reported near Ruiru. Make sure your pheromone traps are set!',
      tags: ['Tomato', 'Pests', 'Alert'],
      likes: 42,
      comments: 18
    },
    {
      id: '3',
      author: 'CropGuard Admin',
      location: 'Nairobi',
      time: '1 day ago',
      content: 'The long rains are approaching. Ensure your field drainage is clear to prevent root rot in maize.',
      tags: ['Maize', 'Weather', 'Preventative'],
      likes: 89,
      comments: 2
    }
  ];

  return (
    <View className="flex-1 bg-gray-100">
      {/* Header */}
      <View className="bg-white px-4 pt-12 pb-4 shadow-sm z-10 flex-row justify-between items-center">
        <Text className="text-2xl font-black text-green-800">Farmer Forum</Text>
        <TouchableOpacity className="bg-green-100 p-2 rounded-full">
          <FontAwesome5 name="search" size={18} color="#166534" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        {posts.map(post => (
          <View key={post.id} className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
            {/* Post Header */}
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 bg-green-200 rounded-full justify-center items-center mr-3">
                <Text className="text-green-800 font-bold">{post.author.charAt(0)}</Text>
              </View>
              <View>
                <Text className="font-bold text-gray-800">{post.author}</Text>
                <Text className="text-xs text-gray-500">{post.location} • {post.time}</Text>
              </View>
            </View>

            {/* Post Content */}
            <Text className="text-gray-700 leading-relaxed mb-3">{post.content}</Text>

            {/* Tags */}
            <View className="flex-row flex-wrap mb-4">
              {post.tags.map(tag => (
                <View key={tag} className="bg-green-50 px-2 py-1 rounded border border-green-200 mr-2 mb-2">
                  <Text className="text-xs text-green-700 font-medium">#{tag}</Text>
                </View>
              ))}
            </View>

            {/* Actions */}
            <View className="flex-row items-center border-t border-gray-100 pt-3">
              <TouchableOpacity className="flex-row items-center mr-6">
                <FontAwesome5 name="arrow-up" size={16} color="#6B7280" className="mr-2" />
                <Text className="text-gray-500 font-medium">{post.likes}</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center">
                <FontAwesome5 name="comment" size={16} color="#6B7280" className="mr-2" />
                <Text className="text-gray-500 font-medium">{post.comments} Comments</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity className="absolute bottom-6 right-6 bg-green-600 w-14 h-14 rounded-full justify-center items-center shadow-lg">
        <FontAwesome5 name="plus" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );
}
