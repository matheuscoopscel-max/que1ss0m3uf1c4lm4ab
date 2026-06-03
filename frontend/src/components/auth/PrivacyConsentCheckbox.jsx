// FILE: frontend/src/components/auth/PrivacyConsentModal.jsx
// Modal de consentimento exibido no formulário de registro.

/**
 * @param {{ accepted: boolean, onChange: (v: boolean) => void, onViewPolicy: () => void }} props
 */
export function PrivacyConsentCheckbox({ accepted, onChange, onViewPolicy }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
      accepted ? "bg-om-safe/5 border-om-safe/30" : "bg-om-surface border-om-border"
    }`}>
      <button
        type="button"
        onClick={() => onChange(!accepted)}
        className={`tv-focusable mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
          accepted ? "bg-om-accent border-om-accent" : "border-om-border bg-om-bg"
        }`}
      >
        {accepted && (
          <svg viewBox="0 0 12 12" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
          </svg>
        )}
      </button>

      <p className="text-xs text-om-muted leading-relaxed">
        Li e concordo com a{" "}
        <button
          type="button"
          onClick={onViewPolicy}
          className="text-om-accent hover:underline font-medium"
        >
          Política de Privacidade
        </button>
        {" "}e autorizo o tratamento dos meus dados para o funcionamento da plataforma,
        conforme a LGPD (Lei 13.709/2018).{" "}
        <span className="text-om-danger font-medium">*</span>
      </p>
    </div>
  );
}
