// API do app (Google Apps Script, publicada como "App da Web").
// Toda requisição precisa do token secreto gerado em configurar().

var PROP_PLANILHA = 'PLANILHA_ID';
var PROP_TOKEN = 'TOKEN';
var ABA_LOG = 'LOG_SYNC';
var MAX_LINHAS_LOG = 3000;

function doGet() {
  return ContentService.createTextOutput('API ativa (versão ' + VERSAO_API + ').');
}

function doPost(e) {
  var resposta;
  try {
    var req = JSON.parse(e.postData.contents);
    var token = PropertiesService.getScriptProperties().getProperty(PROP_TOKEN);
    if (!token || req.token !== token) {
      resposta = { ok: false, erro: 'Token inválido', codigo: 401 };
    } else if (req.acao === 'lerPlanilha') {
      resposta = lerPlanilhaExterna(req.planilha_id, req.abas || []);
    } else {
      var trava = LockService.getScriptLock();
      trava.waitLock(30000);
      try {
        var planilha = abrirPlanilha();
        var tabelas = tabelasDaPlanilha(planilha);
        resposta = processar(tabelas, req, new Date().toISOString());
        if (resposta.log && resposta.log.length) registrarLog(planilha, resposta.log);
        delete resposta.log;
        if (req.acao === 'ping') resposta.planilha = planilha.getUrl();
      } finally {
        trava.releaseLock();
      }
    }
  } catch (erro) {
    resposta = { ok: false, erro: String(erro && erro.message ? erro.message : erro) };
  }
  return ContentService.createTextOutput(JSON.stringify(resposta)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Lê (sem alterar nada) abas de outra planilha da mesma conta — usado para importar o histórico
 * da planilha antiga. Devolve os valores como aparecem na tela (datas e horas já como texto).
 */
function lerPlanilhaExterna(id, abas) {
  if (!id) throw new Error('Informe a planilha.');
  var planilha;
  try {
    planilha = SpreadsheetApp.openById(id);
  } catch (e) {
    throw new Error('Não consegui abrir essa planilha. Confira o endereço e se ela é da mesma conta Google do app.');
  }
  var resultado = {};
  abas.forEach(function (nome) {
    var aba = planilha.getSheetByName(nome);
    resultado[nome] = aba && aba.getLastRow() > 0 ? aba.getRange(1, 1, aba.getLastRow(), aba.getLastColumn()).getDisplayValues() : null;
  });
  return { ok: true, titulo: planilha.getName(), abas: resultado };
}

function abrirPlanilha() {
  var id = PropertiesService.getScriptProperties().getProperty(PROP_PLANILHA);
  if (!id) throw new Error('Execute configurar() no editor do Apps Script primeiro.');
  return SpreadsheetApp.openById(id);
}

/** Adapta cada aba ao formato esperado pelo núcleo (lê uma vez, grava linha a linha). */
function tabelasDaPlanilha(planilha) {
  var tabelas = {};
  Object.keys(ESQUEMA).forEach(function (entidade) {
    var aba = planilha.getSheetByName(ESQUEMA[entidade].aba);
    if (!aba) throw new Error('Aba ' + ESQUEMA[entidade].aba + ' não existe — execute configurar() de novo.');
    var colunas = cabecalho(entidade).length;
    var cache = null;
    var ler = function () {
      if (cache === null) {
        var n = aba.getLastRow() - 1;
        cache = n > 0 ? aba.getRange(2, 1, n, colunas).getDisplayValues() : [];
      }
      return cache;
    };
    tabelas[entidade] = {
      linhas: ler,
      atualizar: function (i, valores) {
        ler()[i] = valores;
        aba.getRange(i + 2, 1, 1, colunas).setValues([valores]);
      },
      anexar: function (valores) {
        ler().push(valores);
        aba.getRange(cache.length + 1, 1, 1, colunas).setValues([valores]);
      },
    };
  });
  return tabelas;
}

function registrarLog(planilha, linhas) {
  var aba = planilha.getSheetByName(ABA_LOG);
  aba.getRange(aba.getLastRow() + 1, 1, linhas.length, linhas[0].length).setValues(linhas);
  var excesso = aba.getLastRow() - 1 - MAX_LINHAS_LOG;
  if (excesso > 500) aba.deleteRows(2, excesso);
}
