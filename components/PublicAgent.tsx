import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { GoogleGenAI } from '@google/genai';
import { House, REQUIRED_DOCS } from '../types';
import { MOCK_HOUSES } from '../constants';

//const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  type?: 'text' | 'house-info';
  houseData?: House;
}

export const PublicAgent: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: '¡Hola! Soy tu asistente virtual de Alcázar de Salamanca. ¿En qué puedo ayudarte hoy? Si deseas consultar el estado de tus documentos, por favor indícame tu número de casa.',
      sender: 'agent',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // 1. Extract house number using Gemini
      const extractionPrompt = `
        Extract the house number from this user message: "${userMessage.text}".
        If the user is asking about a house, return ONLY the number (e.g., "101").
        If the user is just saying hello or asking something else, return "null".
        Context: This is a residential complex called Alcázar de Salamanca.
      `;

      const extractionResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: extractionPrompt,
      });

      const extractedNumber = extractionResponse.text?.trim();

      if (extractedNumber && extractedNumber !== 'null' && !isNaN(Number(extractedNumber))) {
        // Normalize to 3 digits (e.g. "5" -> "005")
        const paddedNumber = extractedNumber.padStart(3, '0');
        
        // 2. Query Supabase
        // Try padded number first
        let { data, error } = await supabase
          .from('houses')
          .select('*')
          .eq('house_number', paddedNumber)
          .maybeSingle();

        // If not found, try exact extracted number
        if (!data && paddedNumber !== extractedNumber) {
             const { data: dataUnpadded } = await supabase
              .from('houses')
              .select('*')
              .eq('house_number', extractedNumber)
              .maybeSingle();
              
             if (dataUnpadded) {
                 data = dataUnpadded;
             }
        }

        // Fallback to MOCK_HOUSES if DB returns nothing (e.g. due to RLS or empty DB)
        if (!data) {
            console.log(`House ${paddedNumber} not found in DB, checking mocks...`);
            const mockHouse = MOCK_HOUSES.find(h => h.houseNumber === paddedNumber || h.houseNumber === extractedNumber);
            if (mockHouse) {
                data = {
                    id: mockHouse.id,
                    house_number: mockHouse.houseNumber,
                    owner_name: mockHouse.ownerName,
                    phone_number: mockHouse.phoneNumber,
                    stage: mockHouse.stage,
                    documents: mockHouse.documents,
                    last_activity: mockHouse.lastActivity,
                    is_constructora: mockHouse.isConstructora
                };
            }
        }

        if (!data) {
           const notFoundMsg: Message = {
            id: Date.now().toString() + '_agent',
            text: `Lo siento, no pude encontrar información para la casa número ${extractedNumber}. Por favor verifica el número e inténtalo de nuevo.`,
            sender: 'agent',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, notFoundMsg]);
        } else {
          // 3. Analyze documents
          const row = data;
          
          // Clean documents (filter out metadata)
          let documents = row.documents;
          if (!documents || !Array.isArray(documents) || documents.length === 0) {
             documents = REQUIRED_DOCS.map(d => ({
               id: d.id,
               name: d.name,
               icon: d.icon,
               isSubmitted: false,
               status: 'pending'
             }));
          }
          documents = documents.filter((d: any) => !d.id.startsWith('METADATA_'));
          
          // Map to House type
          const house: House = {
            id: row.id,
            houseNumber: row.house_number,
            ownerName: '', // Hidden for privacy
            phoneNumber: '', // Hidden for privacy
            stage: 'Foundations', // Hidden/Default
            documents: documents,
            progress: 0, 
            lastActivity: '',
            isConstructora: false,
            livesAbroad: false 
          };
          
          // Update house object with cleaned docs for display
          const cleanHouse = { ...house, documents };

           const pendingDocs = documents.filter((d: any) => !d.isSubmitted);
           const approvedDocs = documents.filter((d: any) => d.status === 'approved');
           
           // Generate response with Gemini
           const contextPrompt = `
             You are a helpful assistant for a residential complex.
             The user asked about house ${house.houseNumber}.
             Pending Documents: ${pendingDocs.map((d: any) => d.name).join(', ') || 'None'}.
             Approved Documents: ${approvedDocs.map((d: any) => d.name).join(', ') || 'None'}.
             
             Generate a friendly, concise response in Spanish summarizing ONLY the status of their documents.
             Do NOT mention the owner's name, phone number, or construction stage.
             Encourage them to submit pending ones if any.
             Do not mention internal IDs.
             
             IMPORTANT: If the user asks about anything else (e.g. general knowledge, weather, sports), politely refuse and state that you can only help with document status information.
           `;

           const response = await ai.models.generateContent({
             model: 'gemini-3-flash-preview',
             contents: contextPrompt,
           });

           const agentMsg: Message = {
             id: Date.now().toString() + '_agent',
             text: response.text || 'Aquí está la información de tu casa.',
             sender: 'agent',
             timestamp: new Date(),
             type: 'house-info',
             houseData: cleanHouse
           };
           setMessages((prev) => [...prev, agentMsg]);
        }
      } else {
        // General conversation
        const chatPrompt = `
          You are a helpful assistant for Alcázar de Salamanca residential complex.
          The user said: "${userMessage.text}".
          
          Respond in Spanish, friendly and professional.
          
          IMPORTANT RULES:
          1. If the user provides a house number, ask them to confirm if they want to check the document status for that house.
          2. If the user asks about document status but didn't provide a number, kindly ask for their house number.
          3. If the user asks about ANYTHING else (general knowledge, weather, sports, jokes, etc.), politely refuse. State that you are a specialized agent designed ONLY to provide information about the documentation status for the Alcázar de Salamanca project. Do not answer the question.
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: chatPrompt,
        });

        const agentMsg: Message = {
            id: Date.now().toString() + '_agent',
            text: response.text || '¿Podrías indicarme tu número de casa para ayudarte?',
            sender: 'agent',
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, agentMsg]);
      }

    } catch (error) {
      console.error('Error in agent:', error);
      const errorMsg: Message = {
        id: Date.now().toString() + '_error',
        text: 'Lo siento, tuve un problema al procesar tu solicitud. Por favor intenta de nuevo más tarde.',
        sender: 'agent',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 flex flex-col h-[500px]"
          >
            {/* Header */}
            <div className="bg-slate-900 p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/20 p-2 rounded-full">
                  <MessageCircle size={20} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Asistente Virtual</h3>
                  <p className="text-xs text-slate-400">Alcázar de Salamanca</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white text-slate-700 shadow-sm border border-gray-100 rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {msg.type === 'house-info' && msg.houseData && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-bold text-xs uppercase text-slate-500">Estado Documental</span>
                            </div>
                            <div className="space-y-2">
                                {msg.houseData.documents?.filter((d: any) => !d.isSubmitted).map((doc: any) => (
                                    <div key={doc.id} className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-1.5 rounded">
                                        <AlertCircle size={14} />
                                        <span>Pendiente: {doc.name}</span>
                                    </div>
                                ))}
                                {msg.houseData.documents?.filter((d: any) => !d.isSubmitted).length === 0 && (
                                    <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-1.5 rounded">
                                        <CheckCircle size={14} />
                                        <span>¡Todo al día!</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <span className={`text-[10px] block mt-1 ${msg.sender === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm border border-gray-100">
                    <Loader2 className="animate-spin text-blue-500" size={16} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t border-gray-100">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Escribe tu número de casa..."
                  className="flex-1 bg-gray-100 border-0 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isTyping}
                  className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-colors z-50 flex items-center justify-center"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </motion.button>
    </>
  );
};
