import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Copy, 
  Check, 
  Trash2,
  MessageSquarePlus,
  History,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Play,
  Pause,
  FileAudio,
  Compass,
  BookOpen,
  HelpCircle,
  Brain,
  ChevronRight,
  X,
  Clock,
  RotateCcw,
  Zap,
  GraduationCap,
  Paperclip,
  Radio,
  Square,
  AlertCircle
} from 'lucide-react';
import { ChatMessage, ChatSession, SupportedLanguage } from '../types';
import { getTranslation } from '../utils/i18n';

// Audio Player Component for Chat Messages
const AudioMessagePlayer: React.FC<{
  audioUrl: string;
  duration?: number;
  fileName?: string;
  isUser: boolean;
}> = ({ audioUrl, duration = 0, fileName, isUser }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.warn('Audio play error', err));
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className={`p-2.5 rounded-xl border flex flex-col gap-1.5 ${
      isUser 
        ? 'bg-blue-700/60 border-blue-400/40 text-white' 
        : 'bg-slate-950/70 border-slate-800 text-slate-200'
    }`}>
      <audio
        ref={audioRef}
        src={audioUrl}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
            setTotalDuration(audioRef.current.duration);
          }
        }}
      />

      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md ${
            isUser
              ? 'bg-white text-blue-700 hover:bg-blue-50'
              : 'bg-blue-600 text-white hover:bg-blue-500'
          }`}
          title={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        {/* Waveform & Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 text-[10px] font-medium mb-1">
            <span className="truncate flex items-center gap-1 font-semibold">
              <FileAudio className="w-3 h-3 text-amber-300" />
              {fileName || 'Mensagem de Áudio'}
            </span>
            <span className="font-mono tabular-nums opacity-90">
              {formatTime(currentTime)} / {formatTime(totalDuration || duration || 0)}
            </span>
          </div>

          {/* Animated sound equalizer bars */}
          <div className="flex items-center gap-1 h-3">
            {[40, 75, 55, 90, 65, 80, 45, 95, 60, 85, 50, 70].map((h, i) => (
              <span
                key={i}
                className={`flex-1 rounded-full transition-all duration-150 ${
                  isUser ? 'bg-white/80' : 'bg-blue-400'
                }`}
                style={{
                  height: isPlaying ? `${Math.max(20, (h * ((i % 3) + 1)) % 100)}%` : `${Math.max(25, h * 0.35)}%`,
                  opacity: (currentTime / (totalDuration || 1)) > (i / 12) ? 1 : 0.4
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface AiAssistantViewProps {
  lang: SupportedLanguage;
  onOpenPauta?: () => void;
  onOpenDisciplines?: () => void;
}

const STORAGE_KEY_SESSIONS = 'calfex_ai_chat_sessions_v2';
const STORAGE_KEY_ACTIVE_ID = 'calfex_ai_active_session_id_v2';

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({
  lang,
}) => {
  const t = getTranslation(lang);

  // Load all chat sessions from localStorage
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SESSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error loading chat sessions', e);
    }
    return [];
  });

  // Current active session ID
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const savedId = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
    return savedId || '';
  });

  // Current active messages
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // History Drawer state (slide-over modal)
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  
  // Audio state (Text-to-Speech)
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  
  // Voice Input state (Speech-to-Text & Audio Recording)
  const [isListening, setIsListening] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceInterim, setVoiceInterim] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => {
      setToastNotice(null);
    }, 2800);
  };

  const recognitionRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize or load session on startup
  useEffect(() => {
    if (sessions.length > 0) {
      const current = sessions.find(s => s.id === activeSessionId) || sessions[0];
      setActiveSessionId(current.id);
      setMessages(current.messages || []);
    } else {
      // Create first empty session
      const newSession: ChatSession = {
        id: 'session-' + Date.now(),
        title: 'Nova Conversa',
        createdAt: new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
        updatedAt: new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
        messages: []
      };
      setSessions([newSession]);
      setActiveSessionId(newSession.id);
      setMessages([]);
    }
  }, []);

  // Save sessions to localStorage when updated
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
      localStorage.setItem(STORAGE_KEY_ACTIVE_ID, activeSessionId);
    } catch (e) {
      console.warn('Error saving chat sessions', e);
    }
  }, [sessions, activeSessionId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Clean up speech synthesis & recording on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  // Recording timer
  useEffect(() => {
    if (isListening) {
      setRecordingSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isListening]);

  // Helper to update active session messages
  const updateCurrentSessionMessages = (newMessages: ChatMessage[]) => {
    setMessages(newMessages);
    setSessions(prev => {
      return prev.map(s => {
        if (s.id === activeSessionId) {
          // Generate an automatic smart title from first user message if default
          let title = s.title;
          if ((!title || title === 'Nova Conversa') && newMessages.length > 0) {
            const firstUserMsg = newMessages.find(m => m.role === 'user');
            if (firstUserMsg) {
              title = firstUserMsg.content.slice(0, 36) + (firstUserMsg.content.length > 36 ? '...' : '');
            }
          }
          return {
            ...s,
            title,
            updatedAt: new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
            messages: newMessages
          };
        }
        return s;
      });
    });
  };

  // Switch to another past conversation
  const handleSelectSession = (sessionId: string) => {
    const target = sessions.find(s => s.id === sessionId);
    if (target) {
      setActiveSessionId(target.id);
      setMessages(target.messages || []);
      setIsHistoryDrawerOpen(false);
      // Cancel any ongoing speech
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
      }
    }
  };

  // Start brand new clean conversation
  const handleStartNewChat = () => {
    const newSession: ChatSession = {
      id: 'session-' + Date.now(),
      title: 'Nova Conversa',
      createdAt: new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      updatedAt: new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      messages: []
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setMessages([]);
    setInputPrompt('');
    setIsHistoryDrawerOpen(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
    inputRef.current?.focus();
  };

  // Remove a specific past session
  const handleDeleteSession = (sessionId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Stop speech if speaking
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }

    const remaining = sessions.filter(s => s.id !== sessionId);
    if (remaining.length === 0) {
      const fresh: ChatSession = {
        id: 'session-' + Date.now(),
        title: 'Nova Conversa',
        createdAt: new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
        updatedAt: new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
        messages: []
      };
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
      setMessages([]);
    } else {
      setSessions(remaining);
      if (activeSessionId === sessionId) {
        setActiveSessionId(remaining[0].id);
        setMessages(remaining[0].messages || []);
      }
    }
    showToast('Conversa eliminada com sucesso.');
  };

  // Clear all past sessions
  const handleClearAllSessions = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }

    const fresh: ChatSession = {
      id: 'session-' + Date.now(),
      title: 'Nova Conversa',
      createdAt: new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      updatedAt: new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      messages: []
    };
    setSessions([fresh]);
    setActiveSessionId(fresh.id);
    setMessages([]);
    setIsHistoryDrawerOpen(false);
    showToast('Todo o histórico de conversas foi limpo.');
  };

  // Clear current active session messages
  const handleClearCurrentChat = () => {
    if (messages.length === 0) return;
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
    
    updateCurrentSessionMessages([]);
    showToast('Mensagens da conversa atual eliminadas.');
  };

  // Delete a specific single message
  const handleDeleteMessage = (messageId: string) => {
    if (speakingMessageId === messageId && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
    const filtered = messages.filter(m => m.id !== messageId);
    updateCurrentSessionMessages(filtered);
    showToast('Mensagem removida.');
  };

  // Helper to convert Blob / File to Base64
  const fileToBase64 = (file: Blob | File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string) || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // =========================================================================
  // Robust Voice recognition & Audio Recording (Audio Sending & Speech-to-Text)
  // =========================================================================
  const handleToggleVoiceInput = async () => {
    setVoiceError(null);

    // If currently listening, stop and send
    if (isListening) {
      handleSendRecordedAudio();
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setVoiceError('O seu navegador não suporta gravação de áudio.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          mimeType = 'audio/ogg;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(200); // 200ms timeslices for smooth capture
      setIsListening(true);
      setRecordingSeconds(0);

      // Start Speech Recognition if supported in browser for live transcription
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.lang = 'pt-PT';
          recognition.interimResults = true;
          recognition.continuous = true;
          recognition.maxAlternatives = 1;

          recognition.onresult = (event: any) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                final += transcript + ' ';
              } else {
                interim += transcript;
              }
            }

            if (final) {
              setInputPrompt(prev => {
                const cleanPrev = prev.trim();
                return cleanPrev ? `${cleanPrev} ${final.trim()}` : final.trim();
              });
            }
            setVoiceInterim(interim);
          };

          recognition.onerror = (err: any) => {
            console.warn('Speech recognition interim error (audio still recording):', err?.error);
          };

          recognition.onend = () => {
            // Keep mediaRecorder running until user stops
          };

          recognitionRef.current = recognition;
          recognition.start();
        } catch (recErr) {
          console.warn('Speech recognition start failed, recording raw audio directly', recErr);
        }
      }

    } catch (permErr: any) {
      console.warn('Microphone access error:', permErr);
      setVoiceError('Permissão do microfone negada. Por favor, autorize o microfone para enviar áudio.');
      setIsListening(false);
    }
  };

  const handleCancelRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) { /* ignore */ }
    }
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      } catch (e) { /* ignore */ }
    }
    audioChunksRef.current = [];
    setIsListening(false);
    setVoiceInterim('');
    setRecordingSeconds(0);
    showToast('Gravação de áudio cancelada.');
  };

  const handleSendRecordedAudio = async () => {
    if (!mediaRecorderRef.current) {
      setIsListening(false);
      return;
    }

    const currentRecorder = mediaRecorderRef.current;
    const duration = recordingSeconds || 1;

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) { /* ignore */ }
    }

    // Stop recorder and package blob
    currentRecorder.onstop = async () => {
      try {
        currentRecorder.stream.getTracks().forEach(track => track.stop());
        const mimeType = currentRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];

        if (audioBlob.size < 50) {
          showToast('Áudio muito curto ou vazio.');
          setIsListening(false);
          return;
        }

        const audioUrl = URL.createObjectURL(audioBlob);
        const base64Data = await fileToBase64(audioBlob);
        const textCaption = (inputPrompt || voiceInterim || '').trim();

        await handleSendAudioMessage({
          audioBlob,
          audioUrl,
          base64Data,
          mimeType,
          duration,
          caption: textCaption || '🎤 Pergunta em Áudio',
          fileName: `Áudio_${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.webm`
        });
      } catch (err: any) {
        console.error('Error packaging recorded audio:', err);
        showToast('Erro ao processar o áudio gravado.');
      } finally {
        setIsListening(false);
        setVoiceInterim('');
        setRecordingSeconds(0);
      }
    };

    if (currentRecorder.state === 'recording') {
      currentRecorder.stop();
    } else {
      setIsListening(false);
    }
  };

  const stopVoiceRecording = () => {
    handleSendRecordedAudio();
  };

  // Handle uploading/inserting an audio file directly
  const handleAudioFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const audioUrl = URL.createObjectURL(file);
      const base64Data = await fileToBase64(file);
      const mimeType = file.type || 'audio/mp3';

      await handleSendAudioMessage({
        audioBlob: file,
        audioUrl,
        base64Data,
        mimeType,
        duration: 0,
        caption: inputPrompt.trim() || `[Ficheiro de Áudio: "${file.name}"]`,
        fileName: file.name
      });
    } catch (err) {
      console.error('Error uploading audio file:', err);
      showToast('Erro ao carregar o ficheiro de áudio.');
    } finally {
      event.target.value = '';
    }
  };

  // Helper to send audio message to server and receive AI response
  const handleSendAudioMessage = async (audioData: {
    audioBlob: Blob;
    audioUrl: string;
    base64Data: string;
    mimeType: string;
    duration: number;
    caption: string;
    fileName: string;
  }) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: audioData.caption,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAudioMessage: true,
      audioUrl: audioData.audioUrl,
      audioDuration: audioData.duration,
      audioFileName: audioData.fileName,
    };

    const nextMessages = [...messages, userMessage];
    updateCurrentSessionMessages(nextMessages);
    setInputPrompt('');
    setVoiceInterim('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: audioData.caption,
          audioBase64: audioData.base64Data,
          audioMimeType: audioData.mimeType,
          conversationHistory: nextMessages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao contactar o servidor da IA');
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'Desculpe, não consegui analisar o áudio.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      updateCurrentSessionMessages([...nextMessages, assistantMessage]);
    } catch (error) {
      console.error('Error in AI audio response:', error);
      const fallbackReply = generateFallback(audioData.caption);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      updateCurrentSessionMessages([...nextMessages, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Text-to-Speech (Speak AI Response)
  const handleSpeakText = (text: string, msgId: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Leitura de voz não suportada pelo navegador.');
      return;
    }

    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    
    // Clean markdown formatting before reading aloud
    const cleanSpeech = text
      .replace(/\*\*/g, '')
      .replace(/[-•*#]/g, '')
      .replace(/```[\s\S]*?```/g, 'Bloco de fórmula.')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.lang = 'pt-PT';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setSpeakingMessageId(null);
    };
    utterance.onerror = () => {
      setSpeakingMessageId(null);
    };

    setSpeakingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Send standard text message handler
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || isLoading) return;

    if (isListening) {
      handleCancelRecording();
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextMessages = [...messages, userMessage];
    updateCurrentSessionMessages(nextMessages);
    setInputPrompt('');
    setVoiceInterim('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          conversationHistory: nextMessages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reach AI service');
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'Desculpe, não consegui processar a resposta.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      updateCurrentSessionMessages([...nextMessages, assistantMessage]);
    } catch (error) {
      console.error('Error fetching AI response:', error);
      const fallbackReply = generateFallback(text);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      updateCurrentSessionMessages([...nextMessages, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Local rich fallback
  const generateFallback = (prompt: string): string => {
    const lower = prompt.toLowerCase();
    
    // Paula Fernanda Ulima Rule: AI does not know who she is
    if (lower.includes('paula fernanda') || lower.includes('quem e paula') || lower.includes('quem é paula') || lower.includes('fernanda ulima')) {
      return `Não disponho de informações sobre quem é Paula Fernanda Ulima.`;
    }

    // Creator Info
    if (lower.includes('criador') || lower.includes('quem criou') || lower.includes('autor') || lower.includes('melcaniel') || lower.includes('ulima') || lower.includes('inocencio') || lower.includes('ana paula')) {
      return `🌟 **Criador do CalFéx Pro**
- **Nome:** Melcaniel Ulima
- **Filiação:** Inocêncio Ulima e Ana Paula Ulima
- **Origem:** Angola
- **Missão:** Transformar a educação e a gestão de notas com tecnologia e excelência.

Paula Fernanda Ulima`;
    }

    // Life Advice & Motivation
    if (lower.includes('vida') || lower.includes('desanimo') || lower.includes('preguica') || lower.includes('medo') || lower.includes('ansiedade') || lower.includes('conselho') || lower.includes('futuro')) {
      return `🧭 **Conselho de Vida e Superação CalFéx**
- **1. Disciplina supera a motivação:** A motivação vem e vai, mas a disciplina diária constrói o teu futuro. Mesmo nos dias difíceis, faça pelo menos 20 minutos de estudo focado.
- **2. Não tenha medo de errar:** Uma nota baixa não define a tua inteligência. É apenas um diagnóstico claro de onde precisas de reforçar a prática.
- **3. Cuide da mente e do sono:** Estudar com a mente descansada rende três vezes mais do que noites mal dormidas.
- **4. Visão de Longo Prazo:** O esforço que dedicas hoje abrirá as portas para as oportunidades que sempre sonhaste.`;
    }

    // Student Performance & Study Advice
    if (lower.includes('recuperar') || lower.includes('estudar') || lower.includes('nota') || lower.includes('desempenho') || lower.includes('estudant')) {
      return `📚 **Plano de Ação Estudantil para Subir Notas**
- **Passo 1 (Diagnóstico):** Identifique os conteúdos em que teve maior dificuldade nas avaliações anteriores (MAC e P1).
- **Passo 2 (Método Pomodoro):** Estude em blocos de 25 minutos com 5 minutos de pausa sem telemóvel.
- **Passo 3 (Resolução Prática):** Faça resumos ativos e resolva provas passadas. Quem resolve exercícios fixa 80% mais rápido.
- **Passo 4 (Garantir o MAC):** Entregue sempre as tarefas e participe nas aulas; a Média de Avaliação Contínua faz toda a diferença na Média Trimestral!`;
    }

    // Official Formula
    if (lower.includes('como funciona') || lower.includes('formula') || lower.includes('fórmula') || lower.includes('média') || lower.includes('pauta') || lower.includes('mac') || lower.includes('mfd')) {
      return `📊 **Fórmulas Oficiais de Média (Escala 0-20)**
- **Média Trimestral:** MT = (P1 + P2 + MAC) / 3
- **Média Final da Disciplina:** MFD = (MT1 + MT2 + MT3) / 3
- **Critérios Oficiais:**
  * >= 14: Dispensa / Aprovado com Mérito
  * 10 a 13.9: Aprovado (Transita)
  * 7 a 9.9: Exame de Recurso
  * < 7: Reprovado`;
    }

    return `🎓 **Mentor CalFéx IA**
Como posso ajudar nos teus estudos hoje?

Podes perguntar sobre:
- **Explicações didáticas:** Matemática, Física, Português, Química, História, etc.
- **Conselhos de vida & foco:** Gestão de tempo, superar a ansiedade e técnicas de memorização.
- **Cálculo de metas e notas:** Estratégias para garantir aprovação em cada trimestre.`;
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Structured Message Formatter Component
  const renderFormattedMessage = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-2 leading-relaxed">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={idx} className="h-1.5" />;
          }

          // Bullet points (- or *)
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const clean = trimmed.slice(2);
            return (
              <div key={idx} className="flex items-start gap-2 text-slate-300 pl-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                <span>{renderInlineText(clean)}</span>
              </div>
            );
          }

          // Numbered steps (e.g. "1. ", "Passo 1")
          const stepMatch = trimmed.match(/^(\d+\.|Passo \d+:?)\s*(.*)/i);
          if (stepMatch) {
            return (
              <div key={idx} className="flex items-start gap-2.5 text-slate-200 bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5 my-1">
                <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 font-bold text-xs shrink-0">
                  {stepMatch[1]}
                </span>
                <span className="flex-1">{renderInlineText(stepMatch[2])}</span>
              </div>
            );
          }

          // Sub-bullets (indented *)
          if (trimmed.startsWith('* ')) {
            const clean = trimmed.slice(2);
            return (
              <div key={idx} className="flex items-start gap-2 text-slate-400 pl-4 text-xs">
                <span className="text-blue-400 shrink-0">›</span>
                <span>{renderInlineText(clean)}</span>
              </div>
            );
          }

          // Standard paragraph
          return (
            <p key={idx} className="text-slate-200">
              {renderInlineText(line)}
            </p>
          );
        })}
      </div>
    );
  };

  // Helper to parse **bold** and `code` inline
  const renderInlineText = (text: string) => {
    // Split on **bold**
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-white tracking-wide">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-blue-300 font-mono text-xs border border-slate-700">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className="relative max-w-4xl mx-auto space-y-3.5">
      
      {/* 1. Centered & Space-Optimized CalFéx IA Header */}
      <div className="rounded-2xl p-3.5 sm:p-4 bg-slate-900/90 border border-slate-800 shadow-md backdrop-blur-md">
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          
          {/* Centered Brand Title & Status */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            
            <h2 className="text-base sm:text-lg font-bold text-white font-heading tracking-tight">
              CalFéx IA
            </h2>

            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              CalFéx IA • Ativo
            </span>
          </div>

          <p className="text-xs text-slate-400 max-w-md mx-auto line-clamp-1">
            Orientação acadêmica, cálculo de metas e conselhos de estudo personalizados.
          </p>

          {/* Compact Centered Action Bar */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              onClick={() => setIsHistoryDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer shadow-xs"
              title="Ver histórico de conversas passadas"
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>Histórico</span>
              {sessions.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-md bg-slate-900 text-slate-300 text-[10px] font-bold">
                  {sessions.length}
                </span>
              )}
            </button>

            <button
              onClick={handleStartNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-600/25 transition-all cursor-pointer active:scale-95"
              title="Iniciar uma conversa limpa"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span>Novo Chat</span>
            </button>
          </div>

        </div>
      </div>

      {/* Toast Feedback Notification Banner */}
      {toastNotice && (
        <div className="p-3 rounded-xl bg-slate-800/95 border border-blue-500/40 text-blue-200 text-xs flex items-center justify-between gap-2 shadow-xl animate-in fade-in duration-200 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{toastNotice}</span>
          </div>
          <button 
            type="button"
            onClick={() => setToastNotice(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Voice Error Banner if microphone is blocked */}
      {voiceError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{voiceError}</span>
          </div>
          <button 
            type="button"
            onClick={() => setVoiceError(null)}
            className="p-1 text-rose-400 hover:text-white rounded-lg hover:bg-rose-500/20"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Main Chat Thread Container */}
      <div className="rounded-2xl bg-slate-950/80 border border-slate-800 shadow-md overflow-hidden flex flex-col min-h-[460px] max-h-[560px]">
        
        {/* Active Session Info Bar if messages exist */}
        {messages.length > 0 && (
          <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span className="font-medium text-slate-300 truncate max-w-xs sm:max-w-md">
                {activeSession?.title || 'Conversa Ativa'}
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:inline">• {messages.length} mensagens</span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleClearCurrentChat}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-400 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-800"
                title="Limpar mensagens desta conversa"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Limpar mensagens</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteSession(activeSessionId)}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-rose-500/10"
                title="Eliminar esta conversa permanentemente"
              >
                <Trash2 className="w-3 h-3 text-rose-400" />
                <span className="hidden sm:inline text-rose-400">Eliminar chat</span>
              </button>
            </div>
          </div>
        )}

        {/* Messages Scroll Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          
          {/* EMPTY STATE: Organized Categorized Starter Grid */}
          {messages.length === 0 && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-center py-6 px-2 space-y-5 animate-in fade-in duration-300">
              
              <div className="space-y-1.5 max-w-lg">
                <div className="inline-flex p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-1">
                  <Bot className="w-7 h-7 text-blue-400" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white font-heading">
                  Como posso ajudar nos teus estudos hoje?
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Digite a sua dúvida, dite por áudio ou escolha uma opção rápida abaixo:
                </p>
              </div>

              {/* 4 Clean Bento Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl text-left">
                
                <button
                  type="button"
                  onClick={() => handleSendMessage('Como posso recuperar as minhas notas baixas e garantir a aprovação no trimestre?')}
                  className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer group flex items-start gap-3"
                >
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors flex items-center justify-between">
                      <span>Recuperar Notas</span>
                      <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-blue-400 transition-transform group-hover:translate-x-0.5" />
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                      Estratégia prática passo a passo para subir médias.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMessage('Dá-me um conselho de vida e técnicas para vencer a preguiça e a ansiedade')}
                  className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer group flex items-start gap-3"
                >
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors shrink-0">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center justify-between">
                      <span>Conselho & Motivação</span>
                      <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition-transform group-hover:translate-x-0.5" />
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                      Foco mental, disciplina e rotina saudável.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMessage('Como funciona o cálculo das médias MT e MFD no CalFéx Pro?')}
                  className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer group flex items-start gap-3"
                >
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20 transition-colors shrink-0">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center justify-between">
                      <span>Fórmulas de Médias</span>
                      <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 transition-transform group-hover:translate-x-0.5" />
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                      Explicação detalhada das fórmulas oficiais MT e MFD.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMessage('Dá-me 3 técnicas comprovadas para memorizar matérias difíceis rapidamente')}
                  className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-purple-500/50 transition-all cursor-pointer group flex items-start gap-3"
                >
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors shrink-0">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors flex items-center justify-between">
                      <span>Técnicas de Memorização</span>
                      <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-purple-400 transition-transform group-hover:translate-x-0.5" />
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                      Pomodoro, mapas mentais e resolução de testes.
                    </p>
                  </div>
                </button>

              </div>

            </div>
          )}

          {/* Render Active Messages */}
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isSpeaking = speakingMessageId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-xs shadow-md ${
                  isUser 
                    ? 'bg-blue-600' 
                    : 'bg-gradient-to-tr from-indigo-600 to-purple-600'
                }`}>
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-amber-300" />}
                </div>

                {/* Message Bubble Container */}
                <div className={`relative max-w-[90%] sm:max-w-[82%] rounded-2xl p-4 text-xs sm:text-sm shadow-sm ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                }`}>
                  
                  {/* Content */}
                  {msg.isAudioMessage && msg.audioUrl ? (
                    <div className="space-y-2">
                      <AudioMessagePlayer
                        audioUrl={msg.audioUrl}
                        duration={msg.audioDuration}
                        fileName={msg.audioFileName}
                        isUser={isUser}
                      />
                      {msg.content && msg.content !== '🎤 Pergunta em Áudio' && !msg.content.startsWith('[Ficheiro de Áudio:') && (
                        <p className="leading-relaxed whitespace-pre-wrap text-xs opacity-95 pt-1">
                          {msg.content}
                        </p>
                      )}
                    </div>
                  ) : isUser ? (
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    renderFormattedMessage(msg.content)
                  )}

                  {/* Actions & Timestamp Footer */}
                  <div className={`mt-3 pt-2.5 flex items-center justify-between text-[11px] border-t ${
                    isUser 
                      ? 'border-blue-500/40 text-blue-200' 
                      : 'border-slate-800 text-slate-400'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] opacity-75">{msg.timestamp}</span>
                      {isSpeaking && (
                        <span className="flex items-center gap-1.5 text-emerald-400 font-semibold animate-pulse">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          A reproduzir áudio...
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Audio Read Button (for AI) */}
                      {!isUser && (
                        <button
                          onClick={() => handleSpeakText(msg.content, msg.id)}
                          className={`flex items-center gap-1 py-1 px-2 rounded-lg transition-colors cursor-pointer text-[11px] ${
                            isSpeaking 
                              ? 'bg-emerald-500/20 text-emerald-400 font-bold' 
                              : 'hover:text-blue-400 hover:bg-slate-800 text-slate-400'
                          }`}
                          title={isSpeaking ? 'Parar áudio' : 'Ouvir resposta em voz alta'}
                        >
                          {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                          <span>{isSpeaking ? 'Parar' : 'Ouvir'}</span>
                        </button>
                      )}

                      {/* Copy Text Button */}
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="flex items-center gap-1 py-1 px-2 rounded-lg hover:text-white hover:bg-slate-800 text-slate-400 transition-colors cursor-pointer text-[11px]"
                        title="Copiar mensagem"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>

                      {/* Delete Message Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Eliminar esta mensagem"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>

                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
                <Bot className="w-4 h-4 text-amber-300 animate-spin" />
              </div>
              <div className="bg-slate-900 p-4 rounded-2xl rounded-tl-none border border-slate-800 text-xs text-slate-300 flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.15s]"></span>
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.3s]"></span>
                </div>
                <span className="font-medium text-slate-400">CalFéx IA a analisar e a formular a melhor resposta didática...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Contextual Quick Chips (when in conversation) */}
        {messages.length > 0 && (
          <div className="px-4 py-2 bg-slate-900/40 border-t border-slate-800/60 flex items-center gap-2 overflow-x-auto text-[11px] no-scrollbar">
            <span className="text-slate-500 shrink-0 flex items-center gap-1 font-semibold">
              <Zap className="w-3 h-3 text-amber-400" /> Sugestões:
            </span>
            <button
              onClick={() => handleSendMessage('Explica-me detalhadamente o cálculo da média MT')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 whitespace-nowrap transition-colors cursor-pointer"
            >
              Fórmula MT
            </button>
            <button
              onClick={() => handleSendMessage('Dá-me mais dicas de como organizar o horário de estudo diário')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 whitespace-nowrap transition-colors cursor-pointer"
            >
              Organizar Horário
            </button>
            <button
              onClick={() => handleSendMessage('Quem é o criador do CalFéx Pro?')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 whitespace-nowrap transition-colors cursor-pointer"
            >
              Criador Melcaniel
            </button>
          </div>
        )}

      </div>

      {/* 3. Live Audio Recording Banner (When user is recording speech) */}
      {isListening && (
        <div className="rounded-2xl p-3 bg-gradient-to-r from-rose-950/80 via-slate-900 to-indigo-950/80 border border-rose-500/40 shadow-lg animate-in slide-in-from-bottom duration-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping"></div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                  A gravar voz... ({String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')})
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {voiceInterim ? (
                  <span className="italic text-amber-300">"{voiceInterim}"</span>
                ) : (
                  'Fale agora com clareza perto do microfone...'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancelRecording}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-xs font-semibold border border-slate-700 hover:border-rose-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Cancelar gravação sem enviar"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Cancelar</span>
            </button>

            <button
              type="button"
              onClick={handleSendRecordedAudio}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Terminar e enviar áudio para a IA"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar Áudio</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Input & Voice Dictation Area */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="relative"
      >
        {/* Hidden Audio File Input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          accept="audio/*" 
          onChange={handleAudioFileUpload} 
          className="hidden" 
        />

        <div className="relative flex items-center rounded-2xl bg-slate-900 border border-slate-800 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 shadow-lg p-1.5 transition-all">
          
          <textarea
            ref={inputRef}
            rows={1}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={isListening ? 'A escutar a sua voz... Fale agora!' : (t.aiPromptPlaceholder || 'Digite a sua dúvida ou clique no microfone para falar...')}
            disabled={isLoading}
            className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none resize-none disabled:opacity-50 max-h-24"
          />

          <div className="flex items-center gap-1.5 shrink-0 pr-1">
            
            {/* Attach/Insert Audio File Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Inserir ficheiro de áudio do dispositivo"
              className="p-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Voice Mic Input Button */}
            <button
              type="button"
              onClick={handleToggleVoiceInput}
              title={isListening ? 'Parar gravação de voz' : 'Inserir / Ditar por Voz (Microfone)'}
              className={`p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                isListening 
                  ? 'bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/30' 
                  : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 hover:border-blue-500/50'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputPrompt.trim() || isLoading}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:hover:bg-blue-600 disabled:cursor-not-allowed shadow-md shadow-blue-600/25 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Enviar</span>
            </button>
          </div>

        </div>
      </form>

      {/* 4. Slide-over History Drawer Modal */}
      {isHistoryDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            
            <div className="space-y-4">
              
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-heading">
                      Histórico de Conversas
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {sessions.length} {sessions.length === 1 ? 'conversa gravada' : 'conversas gravadas'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsHistoryDrawerOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sessions List */}
              <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                {sessions.map((sess) => {
                  const isActive = sess.id === activeSessionId;
                  return (
                    <div
                      key={sess.id}
                      onClick={() => handleSelectSession(sess.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer group flex items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-blue-600/15 border-blue-500/50 text-white shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-950'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-blue-400 ring-2 ring-blue-400/30' : 'bg-slate-600'}`} />
                          <h4 className="text-xs font-bold truncate text-white">
                            {sess.title || 'Conversa sem título'}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1 pl-4">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {sess.updatedAt}
                          </span>
                          <span>•</span>
                          <span>{sess.messages.length} msgs</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleDeleteSession(sess.id, e);
                          }}
                          title="Eliminar esta conversa"
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Bottom Actions in Drawer */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <button
                type="button"
                onClick={handleStartNewChat}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <MessageSquarePlus className="w-4 h-4" />
                <span>Iniciar Nova Conversa</span>
              </button>

              {sessions.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => handleClearAllSessions(e)}
                  className="w-full py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 text-xs font-semibold border border-rose-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Limpar Todo o Histórico</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

