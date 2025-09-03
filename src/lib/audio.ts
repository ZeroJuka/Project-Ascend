import { Audio } from 'expo-av';
import { WHISPER_KEY, WHISPER_URL } from '@env';
import { Animated } from 'react-native';

const whisperUri = WHISPER_URL;
const whisperToken = WHISPER_KEY;


interface RecordingResult {
  uri?: string;
  success: boolean;
  error?: string;
  transcription?: string;
}

interface AnimationState {
  buttonScale: Animated.Value;
  buttonGlow: Animated.Value;
  textOpacity: Animated.Value;
  floatingLetters: Animated.Value[];
  animationInterval: NodeJS.Timeout | null;
}

const recordingOptions = {
  // Configurações para Android
  android: {
      extension: '.mp4', 
      outputFormat: Audio.AndroidOutputFormat.MPEG_4,
      audioEncoder: Audio.AndroidAudioEncoder.AAC,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
  },
  // Configurações para iOS
  ios: {
      extension: '.m4a', 
      outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
      audioQuality: Audio.IOSAudioQuality.MAX,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
  },
  // Configurações para Web... Pq vai q ne
  web: { 
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

class AudioManager {
  private recording: Audio.Recording | undefined;
  private isListening: boolean = false;
  private animationState: AnimationState = {
    buttonScale: new Animated.Value(1),
    buttonGlow: new Animated.Value(0),
    textOpacity: new Animated.Value(1),
    floatingLetters: [],
    animationInterval: null
  };


  //SETUP do objeto de recording e das permissões do mobile
  async setupAudio(): Promise<boolean> {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) return false;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      return true;

    } catch (error) {
      console.error('Erro ao configurar áudio:', error);
      return false;
    }
  }

  //INICIA A GRAVAÇÃO
  async startRecording(): Promise<boolean> {
    try {
      const isSetup = await this.setupAudio();
      if (!isSetup) return false;
      
      if (this.isListening) {
        console.warn('Gravação já está em andamento');
        return false;
      }

      //Cria o recording com as opções de dispositivos setadas
      const { recording: newRecording } = await Audio.Recording.createAsync(
        recordingOptions
      );
      this.recording = newRecording;
      this.isListening = true;
      return true;

    } catch (error) {
      console.error('Falha ao iniciar gravação:', error);
      return false;
    }
  }

  //PARAR A GRAVAÇÃO
  async stopRecording(): Promise<RecordingResult> {
    if (!this.recording) {
      return { success: false, error: 'Nenhuma gravação em andamento' };
    }

    //Para a gravação e retorna o uri
    //Usa o transcribeAudio para transcrever o áudio e setar a String
    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = undefined;
      this.isListening = false;
      return { uri: uri || undefined, success: true, transcription: await this.transcribeAudio(uri || '') };

    } catch (error) {
      console.error('Falha ao parar gravação:', error);
      return { success: false, error: String(error) };
    }
  }

  isRecording(): boolean {
    return this.isListening;
  }

  //Duh
  async cancelRecording(): Promise<boolean> {
    if (!this.recording) return true;
    
    try {
      await this.recording.stopAndUnloadAsync();
      this.recording = undefined;
      this.isListening = false;
      return true;
    } catch (error) {
      console.error('Falha ao cancelar gravação:', error);
      return false;
    }
  }

  //Usa o Whisper pra transcrever o Audio
  async transcribeAudio(uri: string): Promise<string> {
    try {
      console.warn(`
        ==================================================
        Whisper Key Used: ${whisperToken}
        URI Fetched: ${whisperUri}
        ==================================================
      `);
      console.info('Starting transcription...');

      if (!uri) {
        console.error('URI de áudio inválido');
        return '';
      }
      
      // Obter o arquivo de áudio como blob
      const audioResponse = await fetch(uri);
      const audioBlob = await audioResponse.blob();
      
      const apiResponse = await fetch(whisperUri, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whisperToken}`,
        },
        body: audioBlob, // Enviar o blob diretamente
      });
      const contentType = apiResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await apiResponse.text();
        console.error('Resposta não-JSON da API:', textResponse);
        return 'Erro: Serviço de transcrição indisponível. Verifique se o token é válido.';
      }
      
      const data = await apiResponse.json();
      console.info('Transcription data:', JSON.stringify(data),
        'Transcription Uri:', uri
      );

      if (data.text) {
        return data.text;
      } else if (data.error) {
        console.error('Erro na API de transcrição:', data.error);
        return 'Erro: ' + data.error;
      }
      
      return 'Não foi possível transcrever o áudio';
    } catch (error) {
      console.error('Erro ao transcrever áudio:', error);
      return 'Erro na transcrição. Tente novamente.';
    }
  }

  // Métodos de animação
  getAnimationState(): AnimationState {
    return this.animationState;
  }

  initializeAnimationState(): void {
    this.animationState = {
      buttonScale: new Animated.Value(1),
      buttonGlow: new Animated.Value(0),
      textOpacity: new Animated.Value(1),
      floatingLetters: [],
      animationInterval: null
    };
  }

  updateFloatingLetters(text: string): void {
    this.animationState.floatingLetters = text.split('').map(() => new Animated.Value(0));
    this.animateLetters();
  }

  animateLetters(): void {
    if (this.animationState.floatingLetters.length === 0) return;
    
    const animations = this.animationState.floatingLetters.map((value, index) => {
      return Animated.sequence([
        Animated.delay(index * 50), 
        Animated.spring(value, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
      ]);
    });    
    Animated.parallel(animations).start();
  }
  
  startContinuousAnimation(): void {
    this.stopContinuousAnimation();
    
    this.animationState.animationInterval = setInterval(() => {
      this.animationState.floatingLetters.forEach((value) => {
        value.setValue(0);
      });
      
      this.animateLetters();
    }, 1500);
  }
  
  stopContinuousAnimation(): void {
    if (this.animationState.animationInterval) {
      clearInterval(this.animationState.animationInterval);
      this.animationState.animationInterval = null;
    }
  }

  animateButtonPress(isListening: boolean): void {
    if (isListening) {
      Animated.parallel([
        Animated.spring(this.animationState.buttonScale, {
          toValue: 1.6, 
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(this.animationState.buttonGlow, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(this.animationState.buttonGlow, {
              toValue: 0.5,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    } else {
      Animated.spring(this.animationState.buttonScale, {
        toValue: 1.1,
        useNativeDriver: true,
      }).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(this.animationState.buttonGlow, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(this.animationState.buttonGlow, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }

  resetButtonAnimation(): void {
    this.animationState.buttonGlow.stopAnimation();
    Animated.spring(this.animationState.buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }

  startTextFadeOut(delay: number = 5000): void {
    this.animationState.textOpacity.setValue(1);
    setTimeout(() => {
      Animated.timing(this.animationState.textOpacity, {
        toValue: 0,
        duration: 1000, 
        useNativeDriver: true,
      }).start();
    }, delay);
  }
}

export const audioManager = new AudioManager();