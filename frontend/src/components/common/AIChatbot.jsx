import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, MapPin, ShoppingBag, Mic, MicOff } from 'lucide-react';
import axios from 'axios';
import useLocation from '../../hooks/useLocation';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const SUGGESTIONS = [
  'My tomato leaves are turning yellow',
  'Brown spots on wheat crop',
  'White powder on leaves',
  'Insects attacking my cotton',
  'My crop is wilting',
];

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      from: 'bot',
      type: 'text',
      text: '🌿 Namaskar! I am AgroConnect AI. Tell me about your crop problem and I will suggest the right medicine and nearby shops.\n\nExample: "My tomato leaves are turning yellow"',
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef(null);
  const { location, getLocation } = useLocation();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    setMessages(m => [...m, { from: 'user', type: 'text', text: msg }]);
    setLoading(true);

    try {
      const res = await axios.post(`${BASE_URL}/ai/chat/`, {
        message: msg,
        lat: location?.lat,
        lng: location?.lng,
      });
      const data = res.data;
      setMessages(m => [...m, { from: 'bot', type: 'result', data }]);
    } catch {
      setMessages(m => [...m, { from: 'bot', type: 'text', text: '❌ Sorry, I could not process that. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const startVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice not supported in this browser. Try Chrome.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.interimResults = false;
    recognition.start();
    setListening(true);
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setInput(text);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-all flex items-center justify-center hover:scale-110"
      >
        {open ? <X className="w-6 h-6" /> : <Bot className="w-7 h-7" />}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ height: '500px' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-emerald-500 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">AgroConnect AI</p>
              <p className="text-white/70 text-xs">Crop disease & medicine advisor</p>
            </div>
            {!location && (
              <button onClick={getLocation} className="ml-auto text-white/80 hover:text-white text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Location
              </button>
            )}
            {location && <span className="ml-auto text-white/70 text-xs flex items-center gap-1"><MapPin className="w-3 h-3" /> On</span>}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.from === 'bot' && (
                  <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-primary-600" />
                  </div>
                )}
                <div className={`max-w-xs ${m.from === 'user' ? 'bg-primary-600 text-white rounded-2xl rounded-tr-sm' : 'bg-white border border-gray-200 rounded-2xl rounded-tl-sm'} p-3 text-sm shadow-sm`}>
                  {m.type === 'text' && <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>}
                  {m.type === 'result' && <BotResult data={m.data} />}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center mr-2"><Bot className="w-4 h-4 text-primary-600" /></div>
                <div className="bg-white border border-gray-200 rounded-2xl p-3">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => <span key={i} className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {messages.length === 1 && (
            <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto">
              {SUGGESTIONS.slice(0, 3).map(s => (
                <button key={s} onClick={() => sendMessage(s)}
                  className="whitespace-nowrap text-xs bg-primary-50 text-primary-700 border border-primary-200 px-2.5 py-1 rounded-full hover:bg-primary-100 transition-colors flex-shrink-0">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-gray-100 bg-white flex gap-2">
            <button onClick={startVoice} className={`p-2 rounded-lg transition-colors ${listening ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-primary-600 hover:bg-gray-100'}`}>
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Describe your crop problem..."
              className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
              className="bg-primary-600 text-white p-2 rounded-xl hover:bg-primary-700 disabled:opacity-40 transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function BotResult({ data }) {
  return (
    <div className="space-y-2 text-sm">
      <p className="font-semibold text-gray-900">🔍 Diagnosis</p>
      <p className="text-gray-700 text-xs leading-relaxed">{data.diagnosis}</p>

      {data.possible_diseases?.length > 0 && (
        <div>
          <p className="font-semibold text-gray-900 mb-1">🦠 Possible Diseases</p>
          <ul className="space-y-0.5">
            {data.possible_diseases.map((d, i) => <li key={i} className="text-xs text-gray-700">• {d}</li>)}
          </ul>
        </div>
      )}

      {data.recommended_medicines?.length > 0 && (
        <div>
          <p className="font-semibold text-gray-900 mb-1">💊 Recommended</p>
          <ul className="space-y-0.5">
            {data.recommended_medicines.map((m, i) => <li key={i} className="text-xs text-emerald-700 font-medium">✓ {m}</li>)}
          </ul>
        </div>
      )}

      {data.tip && <p className="text-xs text-blue-600 bg-blue-50 rounded-lg p-2">💡 {data.tip}</p>}

      {data.nearby_shops?.length > 0 && (
        <div>
          <p className="font-semibold text-gray-900 mb-1">📍 Nearby Shops</p>
          <div className="space-y-1.5">
            {data.nearby_shops.slice(0, 3).map(s => (
              <div key={s.id} className="bg-green-50 rounded-lg p-2 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 text-xs">{s.shop_name}</p>
                  <p className="text-xs text-gray-500">{s.village} · {s.distance_km} km</p>
                </div>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`}
                  target="_blank" rel="noreferrer"
                  className="text-xs bg-primary-600 text-white px-2 py-1 rounded-lg hover:bg-primary-700">
                  Map
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.source === 'rule-based' && (
        <p className="text-xs text-gray-400">* Rule-based response. Add Cohere API key for AI responses.</p>
      )}
    </div>
  );
}
