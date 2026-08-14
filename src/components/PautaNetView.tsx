import React, { useState } from 'react';
import { Globe, ExternalLink, Plus, Trash2, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { PautaLink } from '../types';

interface PautaNetViewProps {
  links: PautaLink[];
  onAddLink: (link: PautaLink) => void;
  onDeleteLink: (id: string) => void;
}

export const PautaNetView: React.FC<PautaNetViewProps> = ({
  links,
  onAddLink,
  onDeleteLink,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [activeFrameUrl, setActiveFrameUrl] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    let validUrl = urlInput.trim();
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }

    const newLink: PautaLink = {
      id: `link-${Date.now()}`,
      title: titleInput.trim() || 'Portal de Notas da Escola',
      url: validUrl,
      dateAdded: new Date().toLocaleDateString('pt-PT'),
    };

    onAddLink(newLink);
    setUrlInput('');
    setTitleInput('');
  };

  const handleOpenFrame = (url: string) => {
    setActiveFrameUrl(url);
  };

  const handleOpenExternal = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-heading">
              Pauta Net & Portais Escolares
            </h1>
            <p className="text-xs text-slate-400">
              Salve links diretos para a pauta online da sua escola ou visualize no app.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
        <div>
          <strong>Dica:</strong> Insira o link da página de pautas ou do portal do estudante da sua escola. Alguns sites escolares restringem visualização dentro de iframes; nesses casos, utilize o botão <strong>"Abrir no Navegador"</strong>.
        </div>
      </div>

      {/* Add Link Box */}
      <form onSubmit={handleAdd} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-white">Adicionar Novo Link Escolar</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Título / Identificação</label>
            <input
              type="text"
              placeholder="Ex: Portal de Notas do Liceu"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Link URL *</label>
            <input
              type="text"
              placeholder="https://escola.gov.ao/pauta"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Salvar Link</span>
          </button>
        </div>
      </form>

      {/* Saved Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {links.length === 0 ? (
          <div className="col-span-2 p-8 text-center bg-slate-900/50 rounded-3xl border border-slate-800/60 text-slate-400 text-xs">
            Nenhum link escolar cadastrado ainda.
          </div>
        ) : (
          links.map((lnk) => (
            <div key={lnk.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h4 className="font-bold text-white text-sm truncate">{lnk.title}</h4>
                <p className="text-xs text-slate-400 truncate mt-0.5">{lnk.url}</p>
                <span className="text-[10px] text-slate-500">Adicionado em {lnk.dateAdded}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleOpenFrame(lnk.url)}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-semibold border border-blue-500/30"
                  title="Abrir no App"
                >
                  Abrir
                </button>
                <button
                  onClick={() => handleOpenExternal(lnk.url)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Abrir no Navegador"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteLink(lnk.id)}
                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                  title="Apagar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Embedded Iframe Preview */}
      {activeFrameUrl && (
        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-300 truncate max-w-md">
              Visualizando: {activeFrameUrl}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenExternal(activeFrameUrl)}
                className="text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>Abrir em Nova Aba</span>
                <ExternalLink className="w-3 h-3" />
              </button>
              <button
                onClick={() => setActiveFrameUrl(null)}
                className="px-2 py-1 bg-slate-800 text-slate-400 hover:text-white rounded-md"
              >
                Fechar Visualizador
              </button>
            </div>
          </div>
          <div className="w-full h-[500px] rounded-2xl overflow-hidden bg-black border border-slate-800">
            <iframe
              src={activeFrameUrl}
              title="Pauta Net Frame"
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        </div>
      )}

    </div>
  );
};
