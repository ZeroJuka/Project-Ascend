import { Audio } from 'expo-av';
import { WHISPER_KEY, WHISPER_URL } from '@env';
import { Animated } from 'react-native';
import logger from '../utils/logger';

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
      extension: '.m4a', 
      outputFormat: Audio.AndroidOutputFormat.MPEG_4,
      audioEncoder: Audio.AndroidAudioEncoder.AAC,
      sampleRate: 44100,
      numberOfChannels: 1, // Mono para reduzir tamanho
      bitRate: 128000,
  },
  // Configurações para iOS
  ios: {
      extension: '.m4a', 
      outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
      audioQuality: Audio.IOSAudioQuality.MAX,
      sampleRate: 44100,
      numberOfChannels: 1, // Mono para reduzir tamanho
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
  },
  // Configurações para Web
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
      logger.error('Erro ao configurar áudio:', error);
      return false;
    }
  }

  //INICIA A GRAVAÇÃO
  async startRecording(): Promise<boolean> {
    try {
      const isSetup = await this.setupAudio();
      if (!isSetup) return false;
      
      if (this.isListening) {
        logger.warn('Gravação já está em andamento');
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
      logger.error('Falha ao iniciar gravação:', error);
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
      logger.error('Falha ao parar gravação:', error);
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
      logger.error('Falha ao cancelar gravação:', error);
      return false;
    }
  }

  //Usa o Whisper pra transcrever o Audio
  // Verificar conectividade de rede
  private async checkNetworkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      return true;
    } catch (error) {
      logger.warn('Sem conectividade de rede detectada');
      return false;
    }
  }

  // Função auxiliar para retry com backoff
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Tentativa ${attempt + 1}/${maxRetries} falhou:`, error);
        
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
          logger.info(`Aguardando ${delay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }

  async transcribeAudio(uri: string): Promise<string> {
    try {
      if (__DEV__) logger.info('Iniciando transcrição (Whisper configurado?)');

      // Validações iniciais
      if (!uri) {
        logger.error('URI de áudio inválido');
        return 'Erro: URI de áudio inválido';
      }

      if (!whisperToken || !whisperUri) {
        logger.error('Configurações do Whisper não encontradas');
        return 'Erro: Configurações de transcrição não encontradas. Verifique as variáveis de ambiente.';
      }

      // Verificar conectividade
      const hasNetwork = await this.checkNetworkConnectivity();
      if (!hasNetwork) {
        return 'Erro: Sem conexão com a internet. Verifique sua conectividade.';
      }

      // Validar formato do arquivo
      const fileExtension = uri.split('.').pop()?.toLowerCase();
      const supportedFormats = ['m4a', 'wav', 'mp3', 'ogg', 'flac', 'webm'];
      
      if (!fileExtension || !supportedFormats.includes(fileExtension)) {
        logger.error(`Formato de arquivo não suportado: ${fileExtension}`);
        return 'Erro: Formato de áudio não suportado';
      }

      console.info(`Processando arquivo de áudio: ${fileExtension}`);
      
      // Função para fazer a transcrição com retry
      const performTranscription = async (): Promise<string> => {
        // Obter o arquivo de áudio como blob
        console.info('Carregando arquivo de áudio...');
        const audioResponse = await fetch(uri);
        
        if (!audioResponse.ok) {
          throw new Error(`Falha ao carregar arquivo de áudio: ${audioResponse.status}`);
        }
        
        const audioBlob = await audioResponse.blob();
        console.info(`Arquivo carregado: ${audioBlob.size} bytes`);

        // Criar FormData para envio correto
        const formData = new FormData();
        formData.append('file', audioBlob, `audio.${fileExtension}`);
        
        console.info('Enviando para API Whisper...');
        
        // Configurar timeout para a requisição
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos
        
        try {
          const apiResponse = await fetch(whisperUri, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${whisperToken}`,
            },
            body: formData,
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            throw new Error(`API Error ${apiResponse.status}: ${errorText}`);
          }
          
          const contentType = apiResponse.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            const textResponse = await apiResponse.text();
            console.error('Resposta não-JSON da API:', textResponse);
            throw new Error('Resposta inválida da API de transcrição');
          }
          
          const data = await apiResponse.json();
          logger.info('Transcription data:', JSON.stringify(data));

          if (data.text) {
            return data.text;
          } else if (data.error) {
            throw new Error(`API Error: ${data.error}`);
          }
          
          throw new Error('Resposta da API não contém texto transcrito');
          
        } catch (error) {
          clearTimeout(timeoutId);
          if ((error as Error).name === 'AbortError') {
            throw new Error('Timeout: A transcrição demorou muito para responder');
          }
          throw error;
        }
      };

      // Executar transcrição com retry
      const result = await this.retryWithBackoff(performTranscription, 3, 2000);
      console.info('Transcrição concluída com sucesso');
      return result;
      
    } catch (error) {
      logger.error('Erro ao transcrever áudio:', error);
      
      // Mensagens de erro mais específicas
      if ((error as Error).message.includes('Network request failed')) {
        return 'Erro: Falha na conexão de rede. Verifique sua internet e tente novamente.';
      } else if ((error as Error).message.includes('Timeout')) {
        return 'Erro: Timeout na transcrição. O serviço pode estar sobrecarregado.';
      } else if ((error as Error).message.includes('API Error')) {
        return `Erro: ${(error as Error).message}`;
      } else if ((error as Error).message.includes('401')) {
        return 'Erro: Token de autenticação inválido. Verifique suas credenciais.';
      } else if ((error as Error).message.includes('429')) {
        return 'Erro: Muitas requisições. Aguarde um momento e tente novamente.';
      } else {
        return `Erro na transcrição: ${(error as Error).message}`;
      }
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

    Animated.parallel([

      Animated.spring(this.animationState.buttonScale, {
        toValue: 1,
        useNativeDriver: true,
      }),

      //PARA DE BRILHAR PORRAA
      Animated.spring(this.animationState.buttonGlow, {
        toValue: 0,
        useNativeDriver: true,
      }),
      
    ]).start();
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