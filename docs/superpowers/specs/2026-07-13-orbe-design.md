# Orbe — especificação de design

Data: 13 de julho de 2026  
Status: design aprovado  
Plataforma inicial: Windows  
Idioma e moeda iniciais: português do Brasil e BRL

## 1. Resumo

Orbe é um aplicativo gratuito de finanças pessoais para Windows. Cada usuário controla apenas as próprias finanças por inserção manual. O produto reúne contas, receitas, despesas, transferências, recorrências, cartões, faturas, parcelas, orçamentos e relatórios em uma interface local-first que funciona sem internet e sincroniza automaticamente quando a conexão retorna.

O aplicativo é distribuído por um site público hospedado no domínio pessoal do administrador. A hospedagem também fornece autenticação, aprovação de cadastros, recuperação de senha, sincronização, backup, e-mails e atualização do aplicativo.

## 2. Objetivos

- Tornar o registro manual de finanças rápido e compreensível.
- Representar cartões e faturas como funcionam na vida real, sem duplicar despesas.
- Funcionar normalmente sem internet.
- Restaurar e sincronizar os dados do mesmo usuário em outros computadores Windows.
- Manter as finanças de cada usuário privadas e isoladas.
- Oferecer uma experiência visual moderna, discreta e confiável.
- Permanecer gratuito para o administrador e seus familiares.

## 3. Fora do escopo da primeira versão

- Aplicativos para celular, macOS ou Linux.
- Open Finance ou integração direta com bancos.
- Importação OFX, CSV, PDF de fatura ou extrato.
- Moedas estrangeiras e conversão cambial.
- Empréstimos, financiamentos e investimentos.
- Finanças compartilhadas ou visão consolidada da família.
- Pagamentos, movimentação bancária ou emissão de cobranças reais.
- Comercialização, assinatura ou cobrança dentro do produto.

## 4. Princípios do produto

### 4.1 Finanças individuais

Cada conta de usuário possui um espaço financeiro isolado. Não há carteiras familiares, compartilhamento de lançamentos ou acesso administrativo aos relatórios de terceiros.

### 4.2 Local-first

Toda operação financeira é gravada primeiro no computador. A interface lê o banco local e nunca aguarda a rede para concluir uma ação comum. A nuvem sincroniza e restaura; ela não impede o uso offline.

### 4.3 Confirmação antes de movimentar saldo

Uma obrigação pendente não altera o saldo. Despesas recorrentes, contas variáveis e outros compromissos só movimentam a conta depois que o usuário confirma pagamento ou recebimento.

### 4.4 Valores exatos

Valores monetários são armazenados como centavos inteiros. Cálculos não usam ponto flutuante. Diferenças de arredondamento em parcelamentos ficam na última parcela.

## 5. Usuários, autenticação e aprovação

### 5.1 Cadastro

- O cadastro é iniciado no aplicativo.
- O usuário informa nome, e-mail, nome de usuário único e senha.
- O e-mail é confirmado antes de o cadastro entrar na fila de aprovação.
- O status passa a `pendente` após a confirmação.
- O usuário recebe um e-mail informando que deve aguardar.
- A conta administradora recebe um e-mail com link seguro, temporário e condicionado a login administrativo para aprovar ou recusar.
- Após a aprovação, o usuário recebe a confirmação de acesso.

### 5.2 Conta administradora

- A primeira conta torna-se administradora somente durante uma inicialização protegida por segredo único configurado no servidor. Depois desse uso, o cadastro público nunca pode criar outro administrador.
- O painel mostra somente nome, e-mail, nome de usuário, status, data de cadastro e último acesso.
- O administrador pode aprovar, recusar, bloquear ou reativar contas.
- O painel não expõe contas financeiras, cartões, transações, categorias, relatórios ou valores.

### 5.3 Login

- Login com e-mail ou nome de usuário e senha.
- Login opcional com Google.
- Um login Google com o mesmo e-mail deve ser vinculado à conta existente após confirmação, nunca criar uma duplicata silenciosa.
- Toda conta possui e-mail e nome de usuário. Quem iniciar o cadastro com Google escolhe o nome de usuário e pode definir uma senha de acesso ao Orbe; a recuperação por e-mail também permite criar essa senha posteriormente.
- Cadastros iniciados com Google também dependem de aprovação administrativa.

### 5.4 PIN local

- Depois do primeiro login completo, o usuário pode criar um PIN para desbloqueio rápido.
- O PIN vale apenas para aquele computador.
- O segredo local é protegido pelo armazenamento seguro do Windows.
- O usuário sempre pode voltar ao login com e-mail ou nome de usuário e senha.
- Bloqueio automático por inatividade vem desativado e pode ser configurado.
- O menu oferece a ação `Bloquear agora`.

### 5.5 Recuperação de senha

- `Esqueci minha senha` envia um código de seis dígitos por e-mail.
- O código expira em dez minutos, é armazenado de forma não reversível e aceita no máximo cinco tentativas.
- Reenvios têm intervalo mínimo e limite por conta e endereço de rede.
- Após validar o código, o usuário define a nova senha.
- Sessões anteriores e tokens de atualização são revogados.
- Os dados sincronizados permanecem disponíveis.

Esse fluxo prioriza recuperação simples e, portanto, não oferece criptografia de ponta a ponta absoluta.

### 5.6 Exclusão da conta

- A exclusão exige nova autenticação.
- O usuário pode exportar os dados antes de confirmar.
- A conta entra em período de cancelamento de sete dias.
- Durante o período, o usuário pode desfazer a solicitação.
- Ao final, dados locais e hospedados são removidos permanentemente, respeitando apenas registros técnicos mínimos exigidos para segurança.

## 6. Primeiro acesso

Após a aprovação, um assistente curto e opcional permite:

1. Criar contas financeiras.
2. Informar saldos iniciais e suas datas.
3. Cadastrar cartões de crédito.
4. Revisar categorias padrão.

O usuário pode escolher `Configurar depois` e entrar em um dashboard vazio com orientações claras.

## 7. Estrutura da interface

### 7.1 Navegação principal

A navegação lateral é dividida em grupos visuais, sem submenus recolhíveis:

- A marca Orbe no topo.
- Botão destacado `Adicionar`, que abre `Despesa`, `Receita` e `Transferência`.
- Grupo `Principal`: Início, Transações, Contas e Cartões.
- Grupo `Planejamento`: Recorrências e Orçamentos.
- Grupo `Análise`: Relatórios.

`Cartões` reúne cadastro de cartões, fatura atual, histórico de faturas, parcelas e pagamentos. Categorias e subcategorias são administradas em Configurações. Notificações permanecem no sino do cabeçalho.

A sidebar pode ser recolhida para exibir somente ícones. O botão `Adicionar` continua acessível no modo recolhido.

#### Menu do usuário

O rodapé da sidebar fica sempre reservado ao usuário conectado e mostra avatar ou iniciais, nome e um indicador discreto de sincronização. Um ícone de expansão abre um menu com:

- Resumo da conta, contendo nome de usuário e e-mail.
- Meu perfil.
- Lixeira.
- Configurações.
- Administração, somente para a conta administradora.
- Bloquear agora.
- Sair.

Quando a sidebar estiver recolhida, o rodapé mostra apenas o avatar e o indicador de sincronização; clicar nele abre o mesmo menu.

### 7.2 Dashboard

O dashboard usa composição equilibrada e inclui:

- Saldo consolidado das contas ativas.
- Receitas, despesas e resultado do mês.
- Gráfico de fluxo mensal.
- Gastos por categoria e subcategoria.
- Próximos vencimentos.
- Centro de notificações.
- Orçamentos somente quando existirem.
- Coluna direita dedicada ao cartão selecionado.
- Bloco da fatura imediatamente abaixo do cartão.

### 7.3 Cartão visual

O cartão é inspirado na identidade do banco, sem reproduzir de forma exata o cartão físico.

- Sem chip decorativo.
- Logotipo do banco no topo esquerdo.
- Bandeira no topo direito.
- Quatro últimos dígitos mascarados.
- Nome do titular.
- Limite disponível no canto inferior esquerdo.
- Vencimento da fatura no canto inferior direito.

### 7.4 Adição de lançamentos

O botão `Adicionar` abre um menu com `Despesa`, `Receita` e `Transferência`. Cada opção abre seu próprio painel lateral direito, sem abas internas.

#### Despesa

- Descrição.
- Valor.
- Data.
- Categoria.
- Subcategoria, somente quando a categoria possuir opções.
- Meio de pagamento.
- Conta de origem para dinheiro, débito ou equivalente.
- Cartão e parcelamento, somente quando o meio for cartão de crédito.
- Recorrência opcional.
- Estado pendente ou pago.

#### Receita

- Descrição.
- Valor.
- Data.
- Categoria e subcategoria opcional.
- Conta de destino.
- Estado pendente ou recebido.
- Recorrência opcional.

#### Transferência

- Conta de origem.
- Conta de destino.
- Valor.
- Data.
- Observação opcional.
- Sem categoria, pois não é receita nem despesa.

Após salvar, o painel fecha e o dashboard reflete a alteração. Uma ação secundária `Salvar e adicionar outra` mantém o fluxo aberto.

## 8. Modelo financeiro

### 8.1 Contas financeiras

Tipos iniciais:

- Conta-corrente.
- Conta digital.
- Poupança.
- Dinheiro ou carteira.

Uma conta possui nome, instituição opcional, cor, saldo inicial, data do saldo inicial, estado ativo e ordem de exibição. Contas com histórico são arquivadas em vez de apagadas para preservar relatórios.

### 8.2 Transações

Receitas e despesas são lançadas manualmente. Uma transação contém identificador global, usuário, descrição, valor, data de ocorrência, estado, categoria, subcategoria opcional, meio de pagamento, conta opcional e metadados de sincronização.

- Despesa paga reduz a conta indicada.
- Despesa pendente não altera saldo.
- Despesa pendente após o vencimento torna-se atrasada.
- Receita recebida aumenta a conta indicada.
- Receita pendente não altera saldo.
- Transferência confirmada debita a origem e credita o destino na mesma operação atômica.

### 8.3 Categorias e subcategorias

- Categoria é obrigatória em receitas e despesas.
- Subcategoria é opcional e possui somente um nível.
- O Orbe fornece categorias iniciais editáveis.
- Categorias usadas no histórico podem ser desativadas, não removidas de lançamentos antigos.
- Usuários podem criar categorias e subcategorias próprias.

Categorias iniciais de despesa podem incluir moradia, alimentação, transporte, saúde, educação, lazer, assinaturas, compras, impostos e outros. Receitas podem incluir salário, renda extra, reembolso, presente e outros.

### 8.4 Orçamentos

- Orçamento é opcional.
- Pode ser definido para categoria ou subcategoria por mês.
- A ausência de orçamento não bloqueia lançamentos.
- O dashboard só mostra a área quando houver orçamento configurado.
- Alertas usam faixas configuráveis, com sugestões padrão em 80% e 100%.

## 9. Recorrências

### 9.1 Despesa recorrente fixa

Uma regra recorrente contém nome, categoria, subcategoria opcional, valor, frequência mensal, dia de vencimento, meio de pagamento, início, fim opcional e estado pausado.

- A regra gera uma ocorrência pendente para cada mês.
- A ocorrência não movimenta saldo antes da confirmação.
- O usuário pode pausar e retomar a regra.
- Alterações oferecem `somente esta`, `esta e futuras` ou `toda a série` quando aplicável.

### 9.2 Conta recorrente variável

- A regra gera um lembrete mensal, não uma despesa com valor presumido.
- O usuário informa o valor real.
- Depois da confirmação, o Orbe cria a despesa pendente ou paga conforme a escolha.
- Exemplos: água, energia e contas cujo valor muda mensalmente.

## 10. Cartões, faturas e parcelas

### 10.1 Cartão de crédito

Um cartão possui apelido, banco, logotipo, estilo visual, bandeira, quatro últimos dígitos, titular, limite total, dia de fechamento, dia de vencimento e estado ativo.

O cartão não é uma conta financeira e não possui saldo bancário.

### 10.2 Compra no cartão

- A compra guarda data original, descrição, valor total, categoria e cartão.
- O ciclo da fatura é determinado pelo dia de fechamento.
- A compra aparece na fatura correspondente.
- A compra é registrada uma única vez; pagar a fatura não cria nova despesa.

### 10.3 Compra parcelada

- O usuário informa valor total e quantidade de parcelas.
- O Orbe apresenta prévia antes de salvar.
- As parcelas são distribuídas pelas faturas mensais seguintes.
- Cada parcela mantém vínculo com a compra original.
- Diferenças de centavos ficam na última parcela.
- A compra preserva a data original e o total; a visão mensal e a fatura reconhecem cada parcela na competência correspondente.
- Editar ou excluir pergunta se a ação afeta somente a parcela, as futuras ou toda a compra.

### 10.4 Limite disponível

- O valor total ainda não quitado, inclusive parcelas futuras, compromete o limite.
- Pagamentos confirmados recompõem o limite pelo valor pago.
- Pagamentos externos também recompõem o limite.
- O limite disponível nunca é tratado como saldo de conta.

### 10.5 Pagamento de fatura

O usuário seleciona `Pagar fatura` e informa data, valor e origem.

- Pagamento total ou parcial é aceito.
- Origem em conta financeira reduz o saldo dessa conta.
- O pagamento não entra novamente nos relatórios como despesa.
- A fatura mantém o valor original, o total pago e o restante devido.

### 10.6 Pagamento externo

`Pagamento externo` representa ajuda de um terceiro ou qualquer origem fora das contas cadastradas.

- Reduz o valor devido da fatura.
- Recompõe o limite do cartão.
- Não cria receita.
- Não cria conta fictícia.
- Não altera o saldo do usuário.

## 11. Relatórios e exportações

Relatórios iniciais:

- Resumo mensal.
- Receitas versus despesas.
- Gastos por categoria e subcategoria.
- Evolução ao longo do tempo.
- Fluxo e saldo por conta.
- Compras, parcelas e faturas por cartão.
- Orçado versus realizado.

Filtros:

- Período.
- Conta.
- Cartão.
- Categoria e subcategoria.
- Estado pendente, atrasado, pago ou recebido.

Exportações disponíveis em PDF e CSV. Valores seguem `R$`, datas seguem `DD/MM/AAAA` e a interface usa o fuso horário configurado no Windows.

## 12. Lixeira

- Exclusões recuperáveis vão para a lixeira.
- Retenção padrão de 30 dias.
- O usuário pode configurar o número de dias ou escolher nunca excluir automaticamente.
- Ações disponíveis: restaurar, excluir permanentemente e esvaziar lixeira.
- Exclusões e restaurações sincronizam entre dispositivos.
- Entidades de estrutura com histórico, como contas e categorias, são preferencialmente arquivadas.

## 13. Notificações e comportamento do Windows

### 13.1 Notificações

- Sino no aplicativo com indicador e central de notificações.
- Notificação nativa do Windows quando o aplicativo estiver em segundo plano.
- Conteúdo discreto por padrão, sem valores, banco ou descrição sensível.
- Clicar abre o aplicativo no item relacionado.
- O usuário pode configurar tipos, horários e nível de detalhe.

### 13.2 Inicialização e bandeja

- O Orbe inicia com o Windows por padrão.
- Fechar a janela minimiza para a bandeja enquanto essa preferência estiver ativa.
- O usuário pode desativar inicialização e permanência na bandeja.

### 13.3 Tema

- Tema automático segue o Windows por padrão.
- Configurações permitem forçar claro ou escuro.
- Um ícone no cabeçalho oferece acesso rápido às três opções.

## 14. Site público

O site contém:

- Apresentação concisa do Orbe.
- Recursos principais e capturas de tela.
- Download do instalador para Windows.
- Requisitos do sistema e versão atual.
- Histórico de versões.
- Política de privacidade e termos de uso.
- Canal de contato.

O site não oferece painel financeiro web. O cadastro financeiro continua restrito ao aplicativo.

## 15. Arquitetura técnica

### 15.1 Visão geral

Arquitetura escolhida: aplicativo local-first com serviço de sincronização hospedado.

#### Desktop

- Tauri na versão estável adotada durante a implementação.
- React e TypeScript para a interface.
- SQLite criptografado, ou proteção equivalente por campo, para dados locais.
- Núcleo de domínio independente da interface e da persistência.
- Integrações nativas para bandeja, notificações, armazenamento seguro e atualização.

#### Hospedagem

- API Node.js e TypeScript compatível com o ambiente gerenciado da Hostinger.
- API HTTP com contratos versionados.
- MySQL como persistência remota.
- SMTP para e-mails transacionais.
- Site estático ou aplicação web leve no mesmo plano.

### 15.2 Limites dos módulos

- `domain`: regras financeiras puras e cálculos monetários.
- `application`: casos de uso, transações atômicas e validações.
- `local-storage`: SQLite, migrações, outbox e cópias de segurança.
- `sync-client`: envio, recebimento, cursores, repetição e conflitos.
- `desktop-ui`: telas, formulários, estado visual e acessibilidade.
- `native-shell`: recursos específicos do Windows via Tauri.
- `api`: autenticação, aprovação, dispositivos, sincronização e atualização.
- `server-storage`: MySQL, migrações, criptografia e auditoria.
- `site`: apresentação, downloads e documentos legais.

O domínio financeiro não depende de React, Tauri, SQLite, Node.js ou MySQL.

## 16. Sincronização

### 16.1 Fluxo normal

1. O caso de uso valida a ação.
2. A alteração e um item de outbox são gravados na mesma transação SQLite.
3. A interface atualiza imediatamente.
4. O sincronizador envia a outbox quando houver conexão.
5. O servidor aplica a operação de forma idempotente e atribui uma sequência.
6. O cliente baixa alterações posteriores ao último cursor confirmado.
7. O cursor só avança depois de aplicar o lote localmente.

### 16.2 Identidade e versões

- Entidades usam identificadores globais gerados no cliente.
- Operações possuem chave de idempotência.
- Registros carregam versão lógica e data técnica.
- Exclusões sincronizadas usam marcadores de remoção até a expiração segura.
- O servidor valida que todo registro pertence ao usuário autenticado.

### 16.3 Disparadores

A sincronização ocorre:

- Após uma alteração local, quando online.
- Ao iniciar ou desbloquear o aplicativo.
- Ao recuperar conexão.
- Ao voltar do segundo plano.
- Periodicamente enquanto o aplicativo estiver ativo.
- Quando o usuário selecionar `Sincronizar agora`.

### 16.4 Conflitos

- Alterações em registros diferentes são mescladas automaticamente.
- Uma alteração com versão-base desatualizada no mesmo registro cria conflito.
- O Orbe preserva as duas versões até a resolução.
- A interface mostra diferenças relevantes e pede qual versão manter.
- Operações financeiras compostas, como transferências e pagamentos, são aplicadas de forma atômica e nunca parcialmente.

### 16.5 Estado visível

A interface mostra estados discretos: `Sincronizado`, `Aguardando internet`, `Sincronizando`, `Conflito` ou `Erro ao sincronizar`. Nenhum estado de rede bloqueia a consulta da cópia local.

## 17. Segurança e privacidade

### 17.1 Credenciais e sessões

- Senhas usam derivação resistente a força bruta, preferencialmente Argon2id com parâmetros revisados na implementação.
- Tokens de acesso têm curta duração.
- Tokens de renovação são rotacionados e revogáveis por dispositivo.
- Segredos locais ficam no Windows Credential Manager ou mecanismo equivalente.
- Códigos de e-mail nunca são armazenados em texto simples.

### 17.2 Dados

- TLS protege dados em trânsito.
- O banco local é criptografado ou protege campos financeiros de forma equivalente.
- Campos financeiros remotos são criptografados com chaves separadas do banco.
- Chaves de serviço ficam fora do repositório e do banco de dados.
- A arquitetura permite rotação de chaves.

Como a recuperação por e-mail preserva os dados, um operador com acesso simultâneo ao servidor e às chaves técnicas poderia, em teoria, descriptografá-los. A interface administrativa, as permissões da API e os logs não fornecem essa capacidade.

### 17.3 Isolamento

- Toda consulta remota exige escopo de usuário.
- Identificadores enviados pelo cliente não substituem a identidade da sessão.
- Rotas administrativas nunca consultam tabelas ou campos financeiros.
- Testes automatizados tentam acessar recursos de outro usuário.

### 17.4 Logs

Logs não registram valores, descrições, números de cartão, saldos ou conteúdo de relatórios. Auditoria registra apenas evento técnico, usuário, dispositivo, resultado e horário.

## 18. Backup, migração e atualização

- O SQLite cria cópia local antes de toda migração de esquema.
- O servidor usa os backups disponíveis no plano e exportações periódicas do MySQL.
- Restaurações são testadas antes da liberação para familiares.
- O aplicativo verifica atualizações automaticamente.
- A notificação mostra versão e resumo das mudanças.
- Download e instalação exigem confirmação do usuário.
- Manifestos e pacotes de atualização são assinados com a chave privada do Orbe, sem custo, para impedir pacotes adulterados.
- A primeira versão não exige certificado comercial Authenticode. O instalador pode exibir o aviso do Windows SmartScreen; uma assinatura comercial fica opcional para o futuro caso o custo seja aceito.
- Uma atualização nunca apaga o banco local sem uma cópia recuperável.

## 19. Tratamento de erros

- Mensagens explicam o problema e a ação possível em linguagem simples.
- Falhas de rede mantêm alterações na outbox.
- Repetições usam atraso progressivo e não duplicam operações.
- Falhas permanentes deixam o item visível para nova tentativa ou suporte.
- Validações impedem valor zero ou negativo onde não fizer sentido, mesma conta em uma transferência e pagamento acima do permitido sem confirmação explícita.
- Erros inesperados geram diagnóstico técnico sem dados financeiros.
- O aplicativo oferece exportação de diagnóstico mediante consentimento.

## 20. Estratégia de testes

### 20.1 Domínio

- Saldos e transferências.
- Estados pendente, atrasado, pago e recebido.
- Ciclos de fechamento e vencimento.
- Parcelamentos e arredondamento.
- Limite comprometido e recomposto.
- Pagamentos parciais e externos.
- Recorrências fixas e lembretes variáveis.
- Edição e exclusão de séries.

### 20.2 Persistência e sincronização

- Transação entre registro e outbox.
- Idempotência.
- Sincronização após longo período offline.
- Falha no meio de lotes.
- Marcadores de exclusão e restauração.
- Conflitos no mesmo registro.
- Operações simultâneas em registros diferentes.
- Migração e restauração do banco local.

### 20.3 API e segurança

- Cadastro, confirmação, aprovação e bloqueio.
- Login por e-mail, usuário e Google.
- Recuperação de senha, expiração e limites de tentativa.
- Revogação de dispositivos e sessões.
- Isolamento entre usuários.
- Ausência de dados financeiros no painel e nos logs administrativos.

### 20.4 Interface e Windows

- Formulários laterais e campos progressivos.
- Dashboard vazio e preenchido.
- Temas e acessibilidade por teclado.
- Notificações discretas.
- Bandeja e inicialização com o Windows.
- PIN e bloqueio.
- Instalação limpa, atualização e desinstalação.

## 21. Critérios de aceitação da primeira versão

A primeira versão está pronta para uso familiar quando:

- Um novo usuário consegue cadastrar-se, confirmar e-mail, ser aprovado e entrar.
- O administrador não consegue acessar dados financeiros pela interface ou API administrativa.
- O usuário consegue operar contas, receitas, despesas e transferências offline.
- Recorrências geram pendências e lembretes conforme o tipo.
- Compras à vista e parceladas entram nas faturas corretas.
- Pagamentos próprios, parciais e externos produzem saldos, faturas e limites corretos.
- Categorias, subcategorias e orçamentos opcionais aparecem nos relatórios.
- Dados sincronizam entre dois computadores e sobrevivem à reinstalação autenticada.
- Conflitos não causam perda silenciosa.
- PDF e CSV são exportados corretamente em formato brasileiro.
- Lixeira restaura e elimina dados conforme a retenção configurada.
- Recuperação de senha por e-mail funciona e revoga sessões anteriores.
- Instalação, atualização, PIN, bandeja e notificações funcionam no Windows suportado.
- Backup e restauração são demonstrados em ambiente de teste.

## 22. Evoluções posteriores

Após estabilizar a primeira versão, o domínio pode receber módulos separados para investimentos, empréstimos, importação de extratos, outras moedas e outras plataformas. Nenhuma dessas evoluções deve ser acoplada ao núcleo inicial antes de existir uma necessidade validada.
