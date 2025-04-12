import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, PermissionsAndroid } from 'react-native';
import { Audio } from 'expo-av';
import { fetch } from 'expo/fetch';
import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices, MediaStream, MediaStreamTrack } from 'react-native-webrtc';

export default function WebRTC() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('初期化中...');
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const dataChannel = useRef<any>(null);
  const audioQueue = useRef<string[]>([]);
  const isPlaying = useRef(false);

  useEffect(() => {
    requestPermissions();
    return () => {
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
      }
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.CAMERA,
        ]);
        if (
          granted['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED
        ) {
          initializeWebRTC();
        } else {
          setStatus('パーミッションが拒否されました');
        }
      } catch (err) {
        console.warn(err);
      }
    } else {
      initializeWebRTC();
    }
  };

  const initializeWebRTC = async () => {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: false,
      }) as MediaStream;
      localStream.current = stream;

      peerConnection.current = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
        ],
      });

      if (localStream.current) {
        localStream.current.getTracks().forEach((track: MediaStreamTrack) => {
          if (peerConnection.current) {
            peerConnection.current.addTrack(track, localStream.current!);
          }
        });
      }

      if (peerConnection.current) {
        dataChannel.current = peerConnection.current.createDataChannel('oai-events', {
          ordered: true,
        });

        dataChannel.current.onopen = () => {
          console.log('Data channel opened');
          setStatus('データチャネル接続完了');
        };

        dataChannel.current.onmessage = (event: any) => {
          console.log('Received message:', event.data);
          try {
            const data = JSON.parse(event.data);
            console.log('Parsed message:', data);

            if (data.type === 'response.audio_transcript.delta' && data.delta) {
              audioQueue.current.push(data.delta);
              if (!isPlaying.current) {
                playNextAudio();
              }
            }
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };

        dataChannel.current.onerror = (error: any) => {
          console.error('Data channel error:', error);
        };

        dataChannel.current.onclose = () => {
          console.log('Data channel closed');
        };

        peerConnection.current.addEventListener('icecandidate', (event: any) => {
          if (event.candidate) {
            console.log('ICE candidate:', event.candidate);
          }
        });

        peerConnection.current.addEventListener('track', (event: any) => {
          console.log('Received track:', event);
          if (event.streams && event.streams[0]) {
            handleReceivedAudio(event.streams[0] as MediaStream);
          }
        });
      }

      setStatus('接続準備完了');
    } catch (error) {
      console.error('WebRTC初期化エラー:', error);
      setStatus('初期化エラー');
    }
  };

  const handleReceivedAudio = async (stream: MediaStream) => {
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: stream.toURL() },
        { shouldPlay: true }
      );
      setSound(newSound);
    } catch (error) {
      console.error('音声再生エラー:', error);
    }
  };

  const playNextAudio = async () => {
    if (audioQueue.current.length === 0) {
      isPlaying.current = false;
      return;
    }

    isPlaying.current = true;
    const audioData = audioQueue.current.shift();

    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: `data:audio/wav;base64,${audioData}` },
        { shouldPlay: true }
      );

      setSound(newSound);

      newSound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          await newSound.unloadAsync();
          playNextAudio();
        }
      });
    } catch (error) {
      isPlaying.current = false;
      playNextAudio();
    }
  };

  const sendEvent = () => {
    if (dataChannel.current && dataChannel.current.readyState === 'open') {
      try {
        dataChannel.current.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: 'React Nativeについて知っていますか？',
              }
            ]
          }
        }));
        dataChannel.current.send(JSON.stringify({
          type: "response.create",
          response: {
            modalities: [ "audio", "text" ]
          },
        }));
      } catch (error) {
        console.error('Failed to send event:', error);
      }
    } else {
      console.error('Data channel is not open');
      setStatus('データチャネルが接続されていません');
    }
  };

  const startCall = async () => {
    try {
      if (!peerConnection.current) return;

      const offer = await peerConnection.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await peerConnection.current.setLocalDescription(offer);

      const model = 'gpt-4o-realtime-preview-2024-12-17';
      const baseUrl = 'https://api.openai.com/v1/realtime';

      console.log('Sending offer:', offer.sdp);

      const response = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const answerSdp = await response.text();
      console.log('Received answer:', answerSdp);

      const answer = {
        type: 'answer',
        sdp: answerSdp,
      };

      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );

      setIsConnected(true);
      setStatus('接続完了');
    } catch (error) {
      console.error('通話開始エラー:', error);
      setStatus('接続エラー');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>GPT Voice Chat</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.statusText}>{status}</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, isConnected && styles.disabledButton]}
            onPress={startCall}
          >
            <Text style={styles.buttonText}>セッション開始</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, !isConnected && styles.disabledButton]}
            onPress={sendEvent}
            disabled={!isConnected}
          >
            <Text style={styles.buttonText}>イベント送信</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  },
  content: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 16,
    marginBottom: 20,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  recordingButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
