import React, { useState, useRef, useEffect } from 'react';
import { functions } from '../services/supabaseClient';
// FIX: Imported AIAssistantProps to resolve type error.
import { ChatMessage, Company, AuthenticatedUser, AIAssistantProps } from '../types';
import { Send, User, Bot, Loader2, Search, Zap, CheckCircle } from 'lucide-react';

export const AIAssistant: React.FC<AIAssistantProps> = ({ isDemoMode, company, user }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: 'Olá! Sou o Copiloto Fiscal da ContaFlux LR. Posso buscar dados, validar obrigações e executar tarefas. \n\n**Experimente perguntar:**\n- "Quais os erros do SPED de Março/2024?"\n- "Execute o fechamento de Abril/2024."',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !company) return;

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // O BFF agora gerencia o ciclo de Function Calling
      const response = await functions.invokeChat(input, messages, isDemoMode, company.id);
      
      setMessages(prev => [...prev, ...response]);

    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'model',
        text: "Desculpe, tive um problema ao executar a tarefa. Verifique o console de erros.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessageContent = (msg: ChatMessage) => {
    if (msg.role === 'tool' && msg.tool_calls) {
      const toolName = msg.tool_calls[0].name;
      let icon = <Zap size={16} />;
      if (toolName.includes('get')) icon = <Search size={16} />;
      if (toolName.includes('run')) icon = <Zap size={16} />;

      return (
        <div className="flex items-center gap-2 italic text-slate-500 text-sm">
          {icon}
          <span>Executando ferramenta: <strong>{toolName}</strong>...</span>
        </div>
      );
    }
     if (msg.role === 'tool' && msg.tool_outputs) {
       return (
        <div className="flex items-center gap-2 italic text-emerald-600 text-sm">
          <CheckCircle size={16} />
          <span>Ferramenta executada com sucesso. Formulando resposta...</span>
        </div>
      );
     }
    return msg.text;
  };

  return (
    <div className="h-[calc(100vh-4rem)] md:h-auto flex flex-col bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Bot className="text-blue-600" /> Copiloto Fiscal (Operacional)
            </h2>
            <p className="text-xs text-slate-500">IA com acesso a ferramentas de sistema (Function Calling).</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[90%] md:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-indigo-600 text-white'
              }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-3 rounded-2xl shadow-sm text-sm whitespace-pre-wrap ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : msg.role === 'tool'
                  ? 'bg-transparent text-slate-500 rounded-tl-none'
                  : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
              }`}>
                {renderMessageContent(msg)}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[90%] md:max-w-[80%]">
               <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                 <Bot size={16} />
               </div>
               <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2">
                 <Loader2 className="animate-spin text-indigo-600" size={16} />
                 <span className="text-sm text-slate-500">Aguardando resposta do agente...</span>
               </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <div className="flex gap-2 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ex: Gere o fechamento de Março/2024"
            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-xs text-center text-slate-400 mt-2">
            Ações operacionais executadas pela IA serão registradas no log de auditoria.
        </p>
      </div>
    </div>
  );
};