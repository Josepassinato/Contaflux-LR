import React from 'react';
import { FiscalDocument, InvoiceItem } from '../types';
import { X, FileText } from 'lucide-react';
import { CREDIT_CSTS } from '../services/taxEngine';

interface CalculationBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: FiscalDocument[];
  filterKey: 'pis_credits' | 'cofins_credits' | 'icms_credits' | 'pis_debits' | 'cofins_debits' | 'icms_debits';
  title: string;
}

interface BreakdownItem {
  docName: string;
  docDate: string;
  itemName: string;
  itemCST: string;
  itemValue: number;
}

export const CalculationBreakdownModal: React.FC<CalculationBreakdownModalProps> = ({
  isOpen,
  onClose,
  documents,
  filterKey,
  title,
}) => {
  if (!isOpen) return null;

  const getBreakdownData = (): BreakdownItem[] => {
    const data: BreakdownItem[] = [];
    documents.forEach(doc => {
      doc.items.forEach(item => {
        let shouldInclude = false;
        let value = 0;
        const cstPis = item.cstPis || '99';

        switch (filterKey) {
          case 'pis_credits':
            if (doc.operation_type === 'entry' && CREDIT_CSTS.includes(cstPis)) {
              shouldInclude = true;
              value = item.vPIS;
            }
            break;
          case 'cofins_credits':
             if (doc.operation_type === 'entry' && CREDIT_CSTS.includes(cstPis)) {
              shouldInclude = true;
              value = item.vCOFINS;
            }
            break;
          case 'icms_credits':
             if (doc.operation_type === 'entry') { // Simplified for now
              shouldInclude = true;
              value = item.vICMS;
            }
            break;
          case 'pis_debits':
            if (doc.operation_type === 'exit') {
              shouldInclude = true;
              value = item.vPIS;
            }
            break;
           // Add other cases for debits
          default:
            break;
        }

        if (shouldInclude && value > 0) {
          data.push({
            docName: doc.name,
            docDate: doc.date,
            itemName: item.name,
            itemCST: cstPis,
            itemValue: value,
          });
        }
      });
    });
    return data;
  };

  const breakdownData = getBreakdownData();
  const total = breakdownData.reduce((sum, item) => sum + item.itemValue, 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg text-slate-800">Memória de Cálculo: {title}</h3>
            <p className="text-sm text-slate-500">Origem detalhada dos valores apurados</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Documento</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Item</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">CST</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Valor Contribuinte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {breakdownData.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700 truncate max-w-xs">{item.docName}</p>
                      <p className="text-xs text-slate-400">{new Date(item.docDate).toLocaleDateString()}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.itemName}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs">{item.itemCST}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {item.itemValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                  </tr>
                ))}
                {breakdownData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center p-8 text-slate-400 italic">Nenhum item encontrado para este filtro.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <span className="text-sm font-medium text-slate-600">Total: {breakdownData.length} itens</span>
          <div className="text-right">
            <p className="text-xs text-slate-500">Soma Total</p>
            <p className="font-bold text-lg text-blue-600">
              {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
