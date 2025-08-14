import { Audio } from 'expo-av';
import { WHISPER_KEY, WHISPER_URL } from '@env';

const whisperUri = WHISPER_URL;
const whisperToken = WHISPER_KEY;


interface RecordingResult {
  uri?: string;
  success: boolean;
  error?: string;
  transcription?: string;
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
      
      const response = await fetch(uri);
      const audioBlob = await response.blob();

      const apiResponse = await fetch(whisperUri, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whisperToken}`,
          'Content-Type': 'audio/wav',
        },
        body: audioBlob,
      });
      
      const data = await apiResponse.json();
      console.info('Transcription data:', JSON.stringify(data),
        'Transcription Uri:', uri
      );

      if (data.text) {
        return data.text;
      } else if (data.error) {
        console.error('Erro na API de transcrição:', data.error);
        return '';
      }
      
      return '';
    } catch (error) {
      console.error('Erro ao transcrever áudio:', error);
      return '';
    }
  }
}

export const audioManager = new AudioManager();