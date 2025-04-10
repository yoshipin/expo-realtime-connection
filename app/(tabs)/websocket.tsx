import React, { useState, useRef, useEffect } from 'react';
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

export default function WebSocketScreen() {
  const scrollViewRef = useRef<ScrollView>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const [inputText, setInputText] = useState('');
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [messages, setMessages] = useState<Array<{text: string, isUser: boolean}>>([]);
    const addMessage = (text: string, isUser: boolean) => {
      setMessages(prev => [...prev, { text, isUser }]);
    };
  
  const [loading, setLoading] = useState(false);
  // WebSocket connection setup
  useEffect(() => {
    // Initialize WebSocket connection
    wsRef.current = new WebSocket('wss://echo.websocket.events');

    // Connection opened
    wsRef.current.onopen = () => {
      console.log('WebSocket connection established');
      setIsWebSocketConnected(true);
      addMessage('WebSocket接続が確立されました', false);
    };

    // Listen for messages
    wsRef.current.onmessage = (event) => {
      console.log('Message received:', event.data);
      addMessage(`受信: ${event.data}`, false);
    };

    // Handle errors
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      addMessage('WebSocketエラーが発生しました', false);
    };

    // Connection closed
    wsRef.current.onclose = () => {
      console.log('WebSocket connection closed');
      setIsWebSocketConnected(false);
      addMessage('WebSocket接続が閉じられました', false);
    };

    // Cleanup on component unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);


  // Send message via WebSocket
  const sendWebSocketMessage = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      setLoading(true);
      wsRef.current.send(inputText);
      addMessage(`送信: ${inputText}`, true);
      setInputText('');
      setLoading(false);
    } else {
      console.log('WebSocket is not connected');
      addMessage('WebSocket接続が確立されていません', false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          WebSocket Echo {isWebSocketConnected ? '(接続中)' : '(未接続)'}
        </Text>
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
          <View style={[styles.messageBubble, styles.botMessage]}>
            <Loader size={24} color="#666" />
          </View>
        )}
        {messages.map((message, index) => (
          <View 
            key={index} 
            style={[
              styles.messageBubble, 
              message.isUser ? styles.userMessage : styles.botMessage
            ]}
          >
            <Text 
              style={[
                styles.messageText, 
                message.isUser ? styles.userMessageText : styles.botMessageText
              ]}
            >
              {message.text}
            </Text>
          </View>
        ))}
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="メッセージを入力..."
          placeholderTextColor="#666"
          multiline
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={sendWebSocketMessage}
          disabled={!isWebSocketConnected || inputText.trim() === ''}
        >
          <Send
            size={24}
            color={!isWebSocketConnected || inputText.trim() === '' ? '#666' : '#007AFF'}
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