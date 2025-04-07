import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Send, Loader } from 'lucide-react-native';
import { fetch } from 'expo/fetch';
// import { OpenAI } from 'openai';

const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
export default function ChatScreen() {
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [inputText, setInputText] = useState('');
  const [responseText, setResponseText] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchChatStream = async () => {
    setLoading(true);
    setInputText('');
    setResponseText('');

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: inputText }],
        stream: true,
      })
    });

    const reader = res.body?.getReader();
    const decoder = new TextDecoder(); // utf-8

    // Read the stream
    while (true) {
      const stream = await reader?.read();
      if (!stream) {
        setResponseText('Could not get the stream');
        break;
      }

      const { done, value } = stream;
      if (done) {
        break;
      }
      // Decode the stream
      const decodedText = decoder.decode(value, { stream: true,  });
      const chunks = decodedText
        .replace(/data: /g, '') // Remove all data:
        .split('\n')
        .map((item) => item.trim()) // Trim whitespace
        .filter((item) => item.length > 0 && item !== '[DONE]');

      chunks.forEach((jsonString) => {
        try {
          const json = JSON.parse(jsonString);
          const delta = json.choices?.[0]?.delta?.content || '';
    
          setResponseText((prev) => prev + delta);
        } catch (error) {
          console.error('Parsing error:', error);
          return null; // If an error occurs, return null
        }
      });
    }

    setLoading(false);
  };

  // const fetchChatStream = async () => {
  //   setResponseText('')
  //   setLoading(true)
  //   setResponseText('')

  //   const client = new OpenAI({
  //     apiKey: API_KEY,
  //   })

  //   try {
  //     const stream = await client.chat.completions.create({
  //       model: 'gpt-4o',
  //       messages: [
  //         {
  //           role: 'user',
  //           content: inputText,
  //         },
  //       ],
  //       stream: true, 
  //     })

  //     for await (const chunk of stream) {
  //       const delta = chunk.choices?.[0]?.delta?.content || ''
  //       setResponseText((prev) => prev + delta)
  //     }
  //   } catch (error) {
  //     console.error('Error fetching stream:', error)
  //   } finally {
  //     setInputText('')
  //     setLoading(false)
  //   }
  // }


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>GPT Completion</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.chatContainer}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }
      >
        {loading && (
          <View style={[styles.messageBubble]}>
            <Loader size={24} color="#666"  />
          </View>
        )}
        {responseText && (
          <View style={[styles.messageBubble]}>
            <Text style={[styles.messageText]}>{responseText}</Text>
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor="#666"
          multiline
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={fetchChatStream}
          disabled={inputText.trim() === ''}
        >
          <Send
            size={24}
            color={inputText.trim() === '' ? '#666' : '#007AFF'}
          />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  botMessageText: {
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    marginRight: 12,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    fontSize: 16,
    maxHeight: 100,
    color: '#333',
  },
  sendButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
});
