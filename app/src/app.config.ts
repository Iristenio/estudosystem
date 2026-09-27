// ============================================================================
//  CONFIGURAÇÃO DO APP — o primeiro arquivo a ajustar num projeto novo.
//  (O script criar-projeto.ps1 preenche estes valores perguntando ao usuário.)
// ============================================================================

export type Dispositivo = 'tablet' | 'celular' | 'pc';

export const APP = {
  /** Nome completo (aparece na tela de instalação e no título). */
  nome: 'EstudoSystem',
  /** Nome curto (aparece embaixo do ícone na tela inicial). */
  nomeCurto: 'Estudos',
  descricao: 'Aplicativo pessoal que funciona offline',
  /** Cor principal (botões, destaques, barra do sistema). */
  corPrimaria: '#30503a',
  /**
   * Em quais aparelhos o app será usado. Muda o layout:
   *  • só 'celular'           → layout de celular em qualquer tela, orientação retrato
   *  • inclui 'tablet'        → menu lateral em paisagem, alvos de toque grandes (48 px)
   *  • inclui 'pc'            → efeitos de mouse (hover) e atalhos de teclado
   *  • só 'pc'                → alvos de toque menores (40 px)
   */
  dispositivos: ['tablet', 'pc'] as Dispositivo[],
};

export const usaDispositivo = (d: Dispositivo) => APP.dispositivos.includes(d);
export const somenteCelular = APP.dispositivos.length === 1 && APP.dispositivos[0] === 'celular';
export const somentePc = APP.dispositivos.length === 1 && APP.dispositivos[0] === 'pc';
