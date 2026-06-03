// FILE: frontend/src/pages/PrivacyPage.jsx
// Política de Privacidade + exercício de direitos LGPD.

import { useState, useEffect } from "react";
import { useOmniStore } from "../lib/store";
import { api } from "../lib/api";
import { toastSuccess, toastError } from "../components/ui/Toast";

export function PrivacyPage() {
  const user         = useOmniStore((s) => s.user);
  const [tab,        setTab]        = useState("policy");
  const [privStatus, setPrivStatus] = useState(null);
  const [exporting,  setExporting]  = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (user) {
      api.get("/support/privacy/status").then((r) => r.json()).then((d) => {
        if (d.success) setPrivStatus(d.privacy);
      });
    }
  }, [user]);

  async function handleExport() {
    setExporting(true);
    const res = await fetch("/api/support/privacy/export", {
      credentials: "include",
    });
    setExporting(false);
    if (res.ok) {
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `omnimedia-meus-dados.json`;
      a.click();
      URL.revokeObjectURL(url);
      toastSuccess("Seus dados foram exportados.");
    } else {
      toastError("Erro ao exportar dados.");
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    const res  = await api.post("/support/privacy/delete-account", {});
    const data = await res.json();
    setDeleting(false);
    if (res.ok) {
      toastSuccess("Solicitação recebida. Sua conta será excluída em 30 dias.");
      setConfirmDel(false);
    } else {
      toastError(data.message ?? "Erro ao processar solicitação.");
    }
  }

  const POLICY_SECTIONS = [
    {
      title: "1. Quem somos",
      content: `O OmniMedia é uma plataforma open-source de agregação de mídia. Somos o controlador dos dados pessoais que você nos fornece ao criar uma conta e usar a plataforma.`
    },
    {
      title: "2. Dados que coletamos",
      content: `Coletamos apenas o necessário para o funcionamento da plataforma:\n\n• Email e nome de usuário (identificação e login)\n• Senha (armazenada de forma segura com bcrypt — nunca em texto puro)\n• Dados de perfil (avatar, bio, preferências) — opcionais\n• Histórico de leitura (progresso de obras) — para sincronizar seu progresso\n• Endereço IP e dados técnicos de sessão — para segurança da conta (armazenados por 90 dias, depois anonimizados)\n• Posts e comentários na comunidade`
    },
    {
      title: "3. Como usamos seus dados",
      content: `Usamos seus dados exclusivamente para:\n\n• Autenticar e manter sua sessão ativa\n• Salvar seu progresso de leitura\n• Proteger sua conta contra acessos não autorizados\n• Responder suas mensagens de suporte\n• Personalizar sua experiência na plataforma\n\nNão vendemos, alugamos nem compartilhamos seus dados com terceiros para fins publicitários.`
    },
    {
      title: "4. Stripe (pagamentos)",
      content: `Se você assinar o VIP ou comprar OmniCoins, os dados de pagamento são processados diretamente pelo Stripe. Não armazenamos dados de cartão de crédito. O Stripe segue o padrão PCI-DSS. Consulte a política do Stripe em stripe.com/privacy.`
    },
    {
      title: "5. Seus direitos (LGPD — Lei 13.709/2018)",
      content: `Como titular dos dados, você tem direito a:\n\n• Confirmar a existência do tratamento dos seus dados\n• Acessar e exportar seus dados (Art. 18, II e V)\n• Corrigir dados incompletos ou desatualizados\n• Solicitar a exclusão completa da sua conta e dados (Art. 18, VI)\n• Revogar o consentimento a qualquer momento\n• Reclamar perante a ANPD\n\nPara exercer esses direitos, use a aba "Meus Direitos" nesta página ou abra um ticket de Privacidade no Suporte.`
    },
    {
      title: "6. Retenção de dados",
      content: `• Dados da conta: mantidos enquanto a conta estiver ativa\n• IPs e logs de segurança: anonimizados após 90 dias\n• Após exclusão de conta: dados pessoais removidos em até 30 dias; posts são anonimizados (conteúdo mantido sem vinculação ao usuário)`
    },
    {
      title: "7. Segurança",
      content: `Adotamos medidas técnicas e organizacionais para proteger seus dados:\n\n• Criptografia AES-256-GCM para dados sensíveis\n• Senhas com hash bcrypt (salt único por usuário)\n• Tokens de sessão httpOnly, Secure, SameSite\n• 2FA disponível via TOTP\n• Logs de segurança com alertas de acesso suspeito`
    },
    {
      title: "8. Contato",
      content: `Para dúvidas sobre privacidade ou para exercer seus direitos, entre em contato através da Central de Suporte (categoria: Privacidade / LGPD).`
    },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display font-bold text-2xl text-om-text">Privacidade & LGPD</h1>
        <p className="text-om-muted text-sm mt-0.5">Política de privacidade e seus direitos como titular de dados.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-om-surface border border-om-border rounded-xl p-1 w-fit">
        {[["policy","📄 Política"],["rights","⚖️ Meus Direitos"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`tv-focusable px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === id ? "bg-om-card text-om-text shadow-sm" : "text-om-muted hover:text-om-text"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Política de Privacidade */}
      {tab === "policy" && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-om-surface border border-om-border rounded-2xl px-4 py-3">
            <p className="text-xs text-om-muted">
              Versão 1.0 · Vigência: 03/06/2026 · Controlador: OmniMedia
            </p>
          </div>
          {POLICY_SECTIONS.map((s) => (
            <div key={s.title} className="bg-om-card border border-om-border rounded-2xl p-5 space-y-2">
              <h2 className="font-display font-semibold text-om-text">{s.title}</h2>
              <p className="text-sm text-om-muted leading-relaxed whitespace-pre-line">{s.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Exercício de Direitos LGPD */}
      {tab === "rights" && (
        <div className="space-y-4 animate-fade-in">
          {!user ? (
            <div className="text-center py-12 bg-om-card border border-om-border rounded-2xl">
              <p className="text-2xl mb-2">🔒</p>
              <p className="text-sm text-om-muted">Faça login para acessar seus direitos LGPD.</p>
            </div>
          ) : (
            <>
              {/* Status de privacidade */}
              {privStatus && (
                <div className="bg-om-card border border-om-border rounded-2xl p-4 space-y-2">
                  <h2 className="font-display font-semibold text-om-text text-sm">Seu consentimento</h2>
                  <div className="flex items-center gap-2 text-xs text-om-muted">
                    <span className="text-om-safe">✓</span>
                    <span>
                      Política de Privacidade aceita em{" "}
                      {privStatus.privacy_accepted_at
                        ? new Date(privStatus.privacy_accepted_at).toLocaleDateString("pt-BR")
                        : "—"}
                      {" "}(v{privStatus.privacy_version})
                    </span>
                  </div>
                  {privStatus.account_delete_scheduled_at && (
                    <div className="p-3 bg-om-danger/10 border border-om-danger/30 rounded-xl text-xs text-om-danger">
                      ⚠ Conta agendada para exclusão em{" "}
                      {new Date(privStatus.account_delete_scheduled_at).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                </div>
              )}

              {/* Exportar dados */}
              <div className="bg-om-card border border-om-border rounded-2xl p-5 space-y-3">
                <div>
                  <h2 className="font-display font-semibold text-om-text">📦 Exportar meus dados</h2>
                  <p className="text-xs text-om-muted mt-1 leading-relaxed">
                    Baixe uma cópia completa de todos os seus dados: perfil, biblioteca, posts e conquistas.
                    Formato JSON. Direito garantido pelo Art. 18, V da LGPD.
                  </p>
                </div>
                <button onClick={handleExport} disabled={exporting}
                  className="tv-focusable flex items-center gap-2 px-4 py-2.5 rounded-xl border border-om-border bg-om-surface hover:bg-om-card text-sm font-semibold text-om-text disabled:opacity-60 transition-all">
                  {exporting ? <span className="w-4 h-4 rounded-full border-2 border-om-accent border-t-transparent animate-spin" /> : "⬇"}
                  {exporting ? "Gerando arquivo…" : "Baixar meus dados"}
                </button>
              </div>

              {/* Excluir conta */}
              <div className="bg-om-card border border-om-danger/20 rounded-2xl p-5 space-y-3">
                <div>
                  <h2 className="font-display font-semibold text-om-danger">🗑 Excluir minha conta</h2>
                  <p className="text-xs text-om-muted mt-1 leading-relaxed">
                    Solicite a exclusão permanente da sua conta e todos os seus dados pessoais.
                    Você terá 30 dias para cancelar a solicitação. Após esse prazo, a exclusão é irreversível.
                    Direito garantido pelo Art. 18, VI da LGPD.
                  </p>
                </div>

                {!confirmDel ? (
                  <button onClick={() => setConfirmDel(true)}
                    className="tv-focusable px-4 py-2.5 rounded-xl border border-om-danger/30 text-om-danger text-sm font-semibold hover:bg-om-danger/10 transition-colors">
                    Solicitar exclusão da conta
                  </button>
                ) : (
                  <div className="space-y-3 animate-fade-in">
                    <div className="p-3 bg-om-danger/10 border border-om-danger/30 rounded-xl">
                      <p className="text-sm font-semibold text-om-danger">Tem certeza?</p>
                      <p className="text-xs text-om-muted mt-1">
                        Sua conta ficará inativa imediatamente e será excluída permanentemente em 30 dias.
                        Você pode cancelar fazendo login novamente.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmDel(false)}
                        className="tv-focusable px-4 py-2 rounded-xl border border-om-border text-om-muted text-xs hover:text-om-text">
                        Cancelar
                      </button>
                      <button onClick={handleDeleteAccount} disabled={deleting}
                        className="tv-focusable px-4 py-2 rounded-xl bg-om-danger/15 border border-om-danger/40 text-om-danger text-xs font-semibold hover:bg-om-danger/25 disabled:opacity-60">
                        {deleting ? "Processando…" : "Confirmar exclusão"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
