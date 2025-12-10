
import React, { useState } from 'react';
import { FileCheck, Download, Send, AlertCircle, CheckCircle2, Loader2, ShieldCheck, Ban, FileBarChart, Search, AlertTriangle, XCircle, X } from 'lucide-react';
import { Obligation, Company, FiscalDocument, SpedParticipant, SpedProduct, ValidationIssue } from '../types';
import { functions as backendFunctions, obligationService } from '../services/supabaseClient';

interface ObligationsProps {
  obligations: Obligation[];
  company: Company;
  setObligations: React.Dispatch<React.SetStateAction<Obligation[]>>;
  documents: FiscalDocument[];
  onLog?: (action: string, detail: string) => void;
}

export const Obligations: React.FC<ObligationsProps> = ({ obligations, company, setObligations, documents, onLog }) => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [validationReport, setValidationReport] = useState<{ id: string, issues: ValidationIssue[] } | null>(null);

  const handleOfficialValidation = async (id: string, obligation: Obligation) => {
      setProcessingId(id);
      
      try {
          // 1. Filtra os documentos da competência correta
          const relevantDocs = documents.filter(d => d.date.substring(0, 7) === obligation.competence.replace('/', '-'));
          
          // 2. Chama a função de backend simulada
          const issues = await backendFunctions.invokeSpedValidator(relevantDocs, false);
          
          setValidationReport({ id, issues });
          
          const hasErrors = issues.some(i => i.severity === 'error');
          const newStatus = hasErrors ? 'error' : 'validated';
          
          // 3. Atualiza o estado na UI e no banco
          await obligationService.updateStatus(id, newStatus, issues);
          
          setObligations(prev => prev.map(o => (o.id === id ? { ...o, status: newStatus, validation_issues: issues } : o)));

          if (onLog) onLog('Validação Oficial (RFB)', hasErrors ? `Falha: ${issues.length} inconsistências encontradas.` : 'Sucesso: Arquivo pronto para geração.');

      } catch (error) {
          console.error("Erro na validação oficial:", error);
          if (onLog) onLog('Validação Oficial (RFB)', 'Erro ao comunicar com o serviço de validação.', 'error');
      } finally {
          setProcessingId(null);
      }
  };

  const handleTransmit = async (id: string, obligation: Obligation) => {
    setProcessingId(id);
    try {
        const result = await backendFunctions.invokeDocumentTransmitter(obligation, false);
        if (result.success) {
            await obligationService.updateStatus(id, 'transmitted');
            setObligations(prev => prev.map(o => o.id === id ? { ...o, status: 'transmitted' } : o));
            if (onLog) onLog('Transmissão RFB', `Sucesso: ${obligation.name} | Protocolo: ${result.protocol}`, 'success');
        } else {
            throw new Error("Falha na transmissão retornada pelo backend.");
        }
    } catch (error) {
        console.error("Erro na transmissão:", error);
        await obligationService.updateStatus(id, 'error');
        setObligations(prev => prev.map(o => o.id === id ? { ...o, status: 'error' } : o));
        if (onLog) onLog('Transmissão RFB', `Falha ao transmitir ${obligation.name}.`, 'error');
    } finally {
        setProcessingId(null);
    }
  };


  // --- HELPERS PARA SPED (Mantidos para geração do arquivo no cliente antes de enviar) ---
  const pad = (str: string | number, length: number, char: string = '0') => String(str).padStart(length, char);
  const fmtDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${pad(date.getDate(), 2)}${pad(date.getMonth() + 1, 2)}${date.getFullYear()}`;
  };
  const fmtNum = (num: number) => num.toFixed(2).replace('.', ',');
  const cleanStr = (str: string) => str ? str.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 60) : "";

  const getPeriodDates = (competence: string) => {
    const [month, year] = competence.split('/');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    return {
        start: `${pad(startDate.getDate(), 2)}${pad(startDate.getMonth() + 1, 2)}${startDate.getFullYear()}`,
        end: `${pad(endDate.getDate(), 2)}${pad(endDate.getMonth() + 1, 2)}${endDate.getFullYear()}`
    };
  };

  const generateSpedFile = (obligation: Obligation) => {
    const participantesMap = new Map<string, SpedParticipant>();
    const produtosMap = new Map<string, SpedProduct>();
    const lineCounter: Record<string, number> = {};
    const lines: string[] = [];
    let totalLines = 0;

    const addLine = (reg: string, content: string) => {
        lines.push(`|${reg}|${content}|`);
        lineCounter[reg] = (lineCounter[reg] || 0) + 1;
        totalLines++;
    };

    const { start, end } = getPeriodDates(obligation.competence);

    const relevantDocs = documents.filter(d => d.date.substring(0, 7) === obligation.competence.replace('/', '-'));

    relevantDocs.forEach(doc => {
        if (doc.issuer_cnpj && !participantesMap.has(doc.issuer_cnpj)) {
            participantesMap.set(doc.issuer_cnpj, { code: `P${doc.issuer_cnpj.substring(0,8)}`, name: doc.issuer_name || 'PARTICIPANTE', cnpj: doc.issuer_cnpj, type: 'PJ' });
        }
        doc.items?.forEach(item => {
            const prodCode = `I${item.ncm || '0'}-${(item.name || 'item').substring(0,10).replace(/\s/g, '')}`;
            if (!produtosMap.has(prodCode)) {
                produtosMap.set(prodCode, { code: prodCode, name: item.name, unit: 'UN', ncm: item.ncm || '00000000' });
            }
        });
    });

    addLine('0000', `009|0|${start}|${end}|${cleanStr(company.name)}|${company.cnpj}|||UF|123456789|||A|1|`);
    addLine('0001', '0');
    participantesMap.forEach(part => addLine('0150', `${part.code}|${cleanStr(part.name)}|1058|${part.cnpj}|||SP|`));
    addLine('0190', `UN|UNIDADE|`);
    produtosMap.forEach(prod => addLine('0200', `${prod.code}|${cleanStr(prod.name)}|||UN|00|${prod.ncm}|||||`));
    addLine('0990', `${Object.keys(lineCounter).length + 1}`);
    addLine('C001', '0');
    let totalDebitos = 0;
    let totalCreditos = 0;
    relevantDocs.forEach(doc => {
        const partCode = doc.issuer_cnpj ? participantesMap.get(doc.issuer_cnpj)?.code : '';
        addLine('C100', `${doc.operation_type === 'entry' ? '0' : '1'}|0|${partCode}|55|00|1|${doc.access_key?.substring(22, 31) || '1'}|${doc.access_key || ''}|${fmtDate(doc.date)}|${fmtDate(doc.date)}|${fmtNum(doc.amount)}|0|0|${fmtNum(doc.amount)}|9|0|0|${fmtNum(doc.amount)}|${fmtNum(doc.total_pis)}|${fmtNum(doc.total_cofins)}|0|0|`);
        doc.items?.forEach(item => {
            const prodCode = `I${item.ncm || '0'}-${(item.name || 'item').substring(0,10).replace(/\s/g, '')}`;
            addLine('C170', `1|${prodCode}|${cleanStr(item.name)}|1|UN|${fmtNum(item.amount)}|0|0|${item.cst}|${item.cfop}|${item.ncm}|0|${fmtNum(item.vICMS)}|0|0|0|${item.cstPis}|${fmtNum(item.vPIS)}|0|${item.cstCofins}|${fmtNum(item.vCOFINS)}|0|`);
            if (doc.operation_type === 'exit') totalDebitos += item.vICMS; else totalCreditos += item.vICMS;
        });
    });
    addLine('C990', `${Object.keys(lineCounter).filter(k => k.startsWith('C')).length + 1}`);
    addLine('E001', '0');
    addLine('E100', `${start}|${end}|`);
    const saldo = totalDebitos - totalCreditos;
    addLine('E110', `${fmtNum(totalDebitos)}|0|${fmtNum(totalCreditos)}|0|${fmtNum(saldo)}|0|${fmtNum(saldo > 0 ? saldo : 0)}|${fmtNum(saldo < 0 ? Math.abs(saldo) : 0)}|`);
    addLine('E990', '4');
    addLine('9001', '0');
    const sortedKeys = Object.keys(lineCounter).sort();
    sortedKeys.forEach(key => addLine('9900', `${key}|${lineCounter[key]}|`));
    addLine('9900', `9900|${sortedKeys.length + 3}|`); addLine('9900', `9990|1|`); addLine('9900', `9999|1|`);
    addLine('9990', `${Object.keys(lineCounter).length + 4}`);
    addLine('9999', `${totalLines + 4}`);
    return lines.join('\n');
  };

  const downloadFile = (obligation: Obligation) => {
    const fileName = `SPED_EFD_${company.cnpj.replace(/\D/g,'')}_${obligation.competence.replace('/','-')}.txt`;
    const content = generateSpedFile(obligation);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    if (onLog) onLog('Geração de Arquivo', `Arquivo ${fileName} gerado com sucesso.`);
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileBarChart className="text-blue-600" />
            Obrigações & SPED
          </h1>
          <p className="text-slate-500">Controle de entregas, validação e transmissão para a RFB.</p>
        </div>
        <div className="flex gap-2 text-sm self-start md:self-center">
             <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium flex items-center gap-1">
                <ShieldCheck size={14} /> Certificado A1 Ativo (Simulado)
             </span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[800px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Obrigação</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Competência</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Auditoria</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {obligations.map((item) => {
                        const hasDocs = documents.some(d => d.date.substring(0, 7) === item.competence.replace('/', '-'));
                        const hasErrors = item.validation_issues?.some(i => i.severity === 'error');

                        return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-700 flex items-center gap-2">
                                <FileCheck size={18} className="text-slate-400" />
                                {item.name}
                            </td>
                            <td className="px-6 py-4 text-slate-600">{item.competence}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit
                                    ${item.status === 'transmitted' ? 'bg-emerald-100 text-emerald-700' : 
                                    item.status === 'validated' ? 'bg-indigo-100 text-indigo-700' :
                                    item.status === 'error' ? 'bg-red-100 text-red-700' :
                                    item.status === 'generated' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {item.status === 'transmitted' ? <CheckCircle2 size={12} /> : item.status === 'validated' ? <ShieldCheck size={12} /> : item.status === 'error' ? <Ban size={12} /> : null}
                                    {item.status === 'transmitted' ? 'Transmitido' : item.status === 'validated' ? 'Validado' : item.status === 'error' ? 'Erro Validação' : 'Pendente'}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                {item.validation_issues && item.validation_issues.length > 0 ? (
                                    <button 
                                        onClick={() => setValidationReport({ id: item.id, issues: item.validation_issues || [] })}
                                        className={`text-xs font-medium hover:underline flex items-center gap-1 ${hasErrors ? 'text-red-600' : 'text-amber-600'}`}
                                    >
                                        {hasErrors ? <XCircle size={14} /> : <AlertTriangle size={14} />}
                                        {item.validation_issues.length} apontamentos
                                    </button>
                                ) : (
                                    <span className="text-xs text-slate-400">-</span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                    <button 
                                        onClick={() => handleOfficialValidation(item.id, item)}
                                        disabled={!hasDocs || processingId === item.id}
                                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                                        title="Validar na Receita (Simulado)"
                                    >
                                        {processingId === item.id && item.status !== 'transmitted' ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                                    </button>

                                    <button 
                                        onClick={() => downloadFile(item)}
                                        disabled={!hasDocs || processingId === item.id || hasErrors} 
                                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={hasErrors ? "Corrija os erros antes de baixar" : "Baixar Arquivo"}
                                    >
                                        <Download size={18} />
                                    </button>

                                    <button 
                                        onClick={() => handleTransmit(item.id, item)}
                                        disabled={item.status !== 'validated' || processingId === item.id}
                                        className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                                        title="Transmitir para RFB (Simulado)"
                                    >
                                       {processingId === item.id && item.status === 'validated' ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )})}
                    {obligations.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                                Nenhuma obrigação gerada. Importe documentos para começar.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {validationReport && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
                  <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
                      <div>
                          <h3 className="font-bold flex items-center gap-2">
                              <ShieldCheck className={validationReport.issues.some(i => i.severity === 'error') ? 'text-red-400' : 'text-emerald-400'} />
                              Relatório de Validação (RFB)
                          </h3>
                          <p className="text-xs text-slate-400">Resultado da simulação de validação via API de Compliance.</p>
                      </div>
                      <button onClick={() => setValidationReport(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                  </div>
                  <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
                      {validationReport.issues.length === 0 ? (
                          <div className="text-center py-10">
                              <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
                              <h3 className="text-lg font-bold text-slate-700">Tudo Certo!</h3>
                              <p className="text-slate-500">Nenhuma inconsistência encontrada. O arquivo está pronto para transmissão.</p>
                          </div>
                      ) : (
                          <div className="space-y-3">
                              {validationReport.issues.map((issue, idx) => (
                                  <div key={idx} className={`p-3 rounded-lg border flex gap-3 ${ issue.severity === 'error' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100' }`}>
                                      <div className="shrink-0 mt-0.5">
                                          {issue.severity === 'error' ? <Ban size={16} className="text-red-600" /> : <AlertTriangle size={16} className="text-amber-600" />}
                                      </div>
                                      <div>
                                          <p className={`text-sm font-bold ${issue.severity === 'error' ? 'text-red-800' : 'text-amber-800'}`}>{issue.message}</p>
                                          {issue.details && <p className={`text-xs mt-1 ${issue.severity === 'error' ? 'text-red-600' : 'text-amber-700'}`}>{issue.details}</p>}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
                  <div className="p-4 bg-white border-t border-slate-100 text-right">
                      <button onClick={() => setValidationReport(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium text-sm">Fechar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
