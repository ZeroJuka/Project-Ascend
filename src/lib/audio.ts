import { Audio } from 'expo-av';

interface RecordingResult {
  uri?: string;
  success: boolean;
  error?: string;
}


class AudioManager {
  private recording: Audio.Recording | undefined;
  private isListening: boolean = false;


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

  async startRecording(): Promise<boolean> {
    try {
      const isSetup = await this.setupAudio();
      if (!isSetup) return false;

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      this.recording = newRecording;
      this.isListening = true;
      return true;
    } catch (error) {
      console.error('Falha ao iniciar gravação:', error);
      return false;
    }
  }

  async stopRecording(): Promise<RecordingResult> {
    if (!this.recording) {
      return { success: false, error: 'Nenhuma gravação em andamento' };
    }

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = undefined;
      this.isListening = false;
      return { uri: uri || undefined, success: true };

    } catch (error) {
      console.error('Falha ao parar gravação:', error);
      return { success: false, error: String(error) };
    }
  }

  isRecording(): boolean {
    return this.isListening;
  }

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
}

// Exporta uma instância única para toda a aplicação
export const audioManager = new AudioManager();