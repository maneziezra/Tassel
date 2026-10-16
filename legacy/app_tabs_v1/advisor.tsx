import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { askAdvisor, ChatTurn, ScanContext } from '../../lib/advisor';

type Message = { id: string; text: string; sender: 'user' | 'ai'; isError?: boolean };

const WELCOME_ID = 'welcome';

export default function AdvisorScreen() {
  // Optional scan result passed from the Scanner tab, e.g.
  // router.push({ pathname: '/advisor', params: { crop, disease, confidence } })
  const params = useLocalSearchParams<{ crop?: string; disease?: string; confidence?: string }>();
  const scan: ScanContext | undefined =
    params.crop || params.disease
      ? {
          crop: params.crop,
          disease: params.disease,
          confidence: params.confidence ? Number(params.confidence) : undefined,
        }
      : undefined;

  const welcome = scan?.disease
    ? `Jambo! Your scan suggests ${scan.crop ? scan.crop + ' ' : ''}${scan.disease}. How can I help you treat it?`
    : 'Jambo! I am your CropGuard AI Advisor. Ask me about any crop disease, pest, or treatment — in English or Kiswahili.';

  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ id: WELCOME_ID, text: welcome, sender: 'ai' }]);
  const scrollRef = useRef<ScrollView>(null);

  // The tab stays mounted, so start a fresh conversation when a new scan arrives.
  useEffect(() => {
    setMessages([{ id: WELCOME_ID, text: welcome, sender: 'ai' }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.crop, params.disease, params.confidence]);

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    const userMsg: Message = { id: Date.now().toString(), text, sender: 'user' };
    const next = [...messages, userMsg];
    setMessages(next);
    setInputText('');
    setSending(true);

    // Conversation for Claude: skip the local welcome line and any error bubbles.
    const history: ChatTurn[] = next
      .filter((m) => m.id !== WELCOME_ID && !m.isError)
      .map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));

    try {
      const reply = await askAdvisor(history, scan);
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), text: reply, sender: 'ai' }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), text: msg, sender: 'ai', isError: true }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50"
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View className="bg-green-800 pt-12 pb-4 px-4 flex-row items-center shadow-md">
        <View className="bg-white p-2 rounded-full mr-3">
          <FontAwesome5 name="robot" size={20} color="#166534" />
        </View>
        <View>
          <Text className="text-white font-bold text-xl">Claude Agronomist</Text>
          <Text className="text-green-200 text-xs">Swahili / English</Text>
        </View>
      </View>

      {/* Chat History */}
      <ScrollView
        ref={scrollRef}
        className="flex-1 p-4"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            className={`mb-4 max-w-[80%] rounded-2xl p-4 ${
              msg.sender === 'user'
                ? 'bg-green-600 self-end rounded-br-none'
                : msg.isError
                ? 'bg-red-50 self-start border border-red-200 rounded-bl-none'
                : 'bg-white self-start shadow-sm border border-gray-100 rounded-bl-none'
            }`}
          >
            <Text
              className={`${
                msg.sender === 'user' ? 'text-white' : msg.isError ? 'text-red-700' : 'text-gray-800'
              } text-base leading-relaxed`}
            >
              {msg.text}
            </Text>
          </View>
        ))}

        {sending && (
          <View className="mb-4 self-start bg-white rounded-2xl rounded-bl-none p-4 border border-gray-100 flex-row items-center">
            <ActivityIndicator color="#16A34A" />
            <Text className="text-gray-500 ml-3">Thinking…</Text>
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View className="p-4 bg-white border-t border-gray-200 flex-row items-center">
        <TextInput
          className="flex-1 bg-gray-100 rounded-full px-5 py-3 text-base mr-3"
          placeholder="Ask about treatments..."
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={sendMessage}
          editable={!sending}
          returnKeyType="send"
        />
        <TouchableOpacity
          className={`${sending ? 'bg-gray-400' : 'bg-green-600'} w-12 h-12 rounded-full justify-center items-center shadow-sm`}
          onPress={sendMessage}
          disabled={sending}
        >
          <FontAwesome5 name="paper-plane" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
