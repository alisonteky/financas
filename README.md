# Financas do Mes

MVP inicial para organizar contas mensais, parcelas e gastos do mes.

## Como usar

Abra `index.html` no navegador ou publique pelo GitHub Pages. Os dados ficam salvos no proprio navegador usando `localStorage`.

## Deploy

Este projeto ja esta preparado para GitHub Pages.

1. Crie um repositorio no GitHub.
2. Envie estes arquivos para a branch `master` ou `main`.
3. Em **Settings > Pages**, escolha **GitHub Actions** como origem.
4. O workflow `.github/workflows/deploy.yml` vai publicar o site automaticamente.

Para usar um dominio proprio depois, configure o dominio em **Settings > Pages > Custom domain** e aponte o DNS do seu provedor para o GitHub Pages.

## Backup

- Use **Exportar** para baixar um arquivo `.json` com todos os dados.
- Use **Importar** para restaurar um backup em outro navegador ou computador.
- Como este MVP nao tem login nem banco na nuvem, os dados ainda nao sincronizam automaticamente entre dispositivos.

## Login

- Na primeira abertura, crie um usuario e uma senha.
- A senha nao fica salva em texto puro; o app salva um hash local no navegador.
- Este login protege o acesso no mesmo navegador, mas ainda nao e autenticacao de servidor.
- Para varios usuarios ou sincronizacao entre dispositivos, o proximo passo e conectar um backend com autenticacao real.

## Regras do MVP

- Cada lancamento tem nome, data da compra, valor opcional, tipo e status de pagamento.
- Contas mensais e parcelas tem vencimento; gastos do mes usam apenas a data da compra.
- A aba **A pagar** mostra tudo que ainda nao foi pago no mes atual.
- A aba **Pagas** mostra o que foi marcado como pago.
- A aba **Concluidas** recebe gastos pagos e parcelas finais pagas quando o mes vira.
- Contas mensais pagas voltam para **A pagar** no novo mes.
- Parcelas pagas avancam uma parcela no novo mes; se a parcela paga era a ultima, vao para **Concluidas**.
- Ao abrir o app em um novo mes, o fechamento acontece automaticamente.
- O botao **Fechar mes** simula a virada de mes para testar a regra sem esperar o calendario.
