// Ícones em SVG (traço), para não depender de fontes externas offline.
import type { JSX } from 'preact';

type Props = JSX.SVGAttributes<SVGSVGElement>;

function Base({ children, ...props }: Props & { children: JSX.Element | JSX.Element[] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width={1.9}
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconeHoje = (p: Props) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Base>
);

export const IconeCalendario = (p: Props) => (
  <Base {...p}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Base>
);

export const IconeTarefas = (p: Props) => (
  <Base {...p}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M8 12.5l2.5 2.5L16 9.5" />
  </Base>
);

export const IconeEquipe = (p: Props) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M16 14.6c2.8 0 5 1.9 5 4.9" />
  </Base>
);

export const IconeConfig = (p: Props) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Base>
);

export const IconeMais = (p: Props) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const IconeFechar = (p: Props) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);

export const IconeRelogio = (p: Props) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Base>
);

export const IconeBolo = (p: Props) => (
  <Base {...p}>
    <path d="M4 21h16M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7" />
    <path d="M5 16c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 5 0M12 12V8M12 5.5c.8-.8.8-1.7 0-2.5-.8.8-.8 1.7 0 2.5z" />
  </Base>
);

export const IconeFerias = (p: Props) => (
  <Base {...p}>
    <path d="M3 21h18M12 21V9" />
    <path d="M12 9C9 5 5 5 3 7c3 0 6 .5 9 2zM12 9c3-4 7-4 9-2-3 0-6 .5-9 2zM12 9c-1-3.5 1-6 3-6.5-.5 2-1.5 4-3 6.5z" />
  </Base>
);

export const IconeRepetir = (p: Props) => (
  <Base {...p}>
    <path d="M17 2l3 3-3 3" />
    <path d="M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3" />
    <path d="M20 13v2a4 4 0 0 1-4 4H4" />
  </Base>
);

export const IconeArrastar = (p: Props) => (
  <Base {...p}>
    <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" stroke-width={3} />
  </Base>
);

export const IconeLapis = (p: Props) => (
  <Base {...p}>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z" />
    <path d="M13.5 6.5l4 4" />
  </Base>
);

export const IconeLista = (p: Props) => (
  <Base {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" stroke-width={3} />
  </Base>
);

export const IconeAlerta = (p: Props) => (
  <Base {...p}>
    <path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </Base>
);

export const IconeCronometro = (p: Props) => (
  <Base {...p}>
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M12 13.5V10M10 2.5h4M18.5 6.5l1.5-1.5" />
  </Base>
);

export const IconeGrafico = (p: Props) => (
  <Base {...p}>
    <path d="M4 20h16" />
    <path d="M7 16v-4M12 16V7M17 16v-6" stroke-width={2.6} />
  </Base>
);

export const IconeProgresso = (p: Props) => (
  <Base {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" stroke-opacity={0.3} stroke-width={3} />
    <path d="M4 7h10M4 12h14M4 17h6" stroke-width={3} />
  </Base>
);

export const IconeCiclo = (p: Props) => (
  <Base {...p}>
    <path d="M20 12a8 8 0 0 1-13.7 5.7M4 12a8 8 0 0 1 13.7-5.7" />
    <path d="M18 3v3.5h-3.5M6 21v-3.5h3.5" />
  </Base>
);

export const IconeLivro = (p: Props) => (
  <Base {...p}>
    <path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z" />
    <path d="M12 6.5v13" />
  </Base>
);

export const IconeBalanca = (p: Props) => (
  <Base {...p}>
    <path d="M12 4v16M8 20h8M5 7h14" />
    <path d="M5 7l-2.5 6a2.5 2.5 0 0 0 5 0L5 7zM19 7l-2.5 6a2.5 2.5 0 0 0 5 0L19 7z" />
  </Base>
);

export const IconeMenu = (p: Props) => (
  <Base {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Base>
);

export const IconeSetaCima = (p: Props) => (
  <Base {...p}>
    <path d="M6 15l6-6 6 6" />
  </Base>
);

export const IconeSetaBaixo = (p: Props) => (
  <Base {...p}>
    <path d="M6 9l6 6 6-6" />
  </Base>
);
