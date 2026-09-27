// Cadastros iniciais, copiados da planilha EstudoSystem (abas Config_Disciplinas e Leis).
// Os ids são os MESMOS da planilha (D01…, L01…): assim a importação do histórico (etapa 7)
// reconhece esses registros em vez de duplicá-los. Observações virão com a importação.
import type { Disciplina, Lei } from './tipos';
import { novaDisciplina } from './disciplinas';
import { novaLei } from './leis';

export function disciplinasIniciais(agora = new Date()): Disciplina[] {
  const d = (id: string, ordem: number, nome: string, categoria: string, peso: number, paginas: number, horas: number, cor: string) =>
    novaDisciplina({ id, ordem, nome, categoria, peso, total_paginas: paginas, total_horas_video: horas, cor }, agora);
  return [
    d('D01', 1, 'DIREITO CONSTITUCIONAL', 'NÚCLEO COMUM', 2, 1064, 70, '#ba9121'),
    d('D02', 2, 'REDES DE COMPUTADORES', 'NÚCLEO TÉCNICO', 2, 757, 40, '#e3f028'),
    d('D03', 3, 'DIREITO ADMINISTRATIVO', 'NÚCLEO COMUM', 1, 1344, 59, '#5a74dd'),
    d('D04', 4, 'BANCO DE DADOS', 'NÚCLEO TÉCNICO', 2, 605, 36, '#e7ea39'),
    d('D05', 5, 'LÍNGUA PORTUGUESA', 'NÚCLEO COMUM', 1, 503, 47, '#dabe34'),
  ];
}

export function leisIniciais(agora = new Date()): Lei[] {
  return [
    novaLei(
      {
        id: 'L01',
        disciplina_id: 'D03',
        nome: 'Lei 9.784/99 - Processo Administrativo',
        total_artigos: 70,
        descricao: 'Regula o processo administrativo no âmbito da Administração Pública Federal.',
      },
      agora,
    ),
  ];
}
