# Fronteira local-first do desktop

Este documento registra a fronteira de persistência comprovada no marco inicial do Orbe e separa essa implementação da cadeia de escrita que será completada pelas próximas funcionalidades de interface.

## Estado da cadeia de escrita

A cadeia-alvo é:

```text
evento React
  -> caso de uso da aplicação
  -> LocalFinanceStore.applyMutation
  -> invoke("apply_local_mutation")
  -> transação SQL IMMEDIATE
  -> upsert em entities + insert em outbox
  -> commit único
```

Neste marco, a parte entre `LocalFinanceStore` e o commit atômico está implementada. A evidência, porém, está dividida em testes separados: o teste TypeScript cobre a porta/adaptador e o `invoke`, enquanto os testes Rust cobrem o comando interno e a transação. Ainda não existe um teste de integração que atravesse IPC, construa `tauri::State` e chegue ao SQL. Os dois primeiros passos também continuam como pontos de extensão:

| Passo | Estado neste marco | Evidência |
| --- | --- | --- |
| Evento React | Ainda não implementado para finanças. A tela atual só renderiza o shell e a ação `Configurar depois`; ela recebe as dependências, mas não chama o armazenamento. | `apps/desktop/src/app/App.tsx` |
| Caso de uso da aplicação | Ainda não implementado. Futuras funcionalidades deverão construir e validar a intenção financeira antes de chamar a porta. | A ausência deliberada de módulos de caso de uso e o limite definido em `apps/desktop/src/app/ports.ts` |
| Porta `LocalFinanceStore` | Implementada. `applyMutation` aceita `LocalMutationCommand` e devolve `MutationReceipt`. | `apps/desktop/src/app/ports.ts` |
| Composição | Implementada. O adaptador Tauri é injetado como implementação da porta; componentes não precisam importar a API do Tauri. | `apps/desktop/src/app/composition.ts` |
| Adaptador Tauri | Implementado. Valida o comando com Zod, chama somente `apply_local_mutation`, valida o recibo e converte falhas para um erro estável que não revela detalhes nativos. Seu teste usa um mock de `invoke`; não atravessa o IPC real. | `apps/desktop/src/infrastructure/tauri-local-finance-store.ts` e seu teste |
| Comando nativo | Implementado e registrado como o único comando financeiro do shell. Ele recebe o estado do banco e serializa o acesso à conexão. Os testes Rust exercitam a função transacional com uma conexão real temporária, mas não constroem `tauri::State` nem invocam o comando por IPC. | `apps/desktop/src-tauri/src/lib.rs` e `apps/desktop/src-tauri/src/commands/local_finance.rs` |
| Transação SQLite | Implementada com `TransactionBehavior::Immediate`. O comando verifica idempotência e versão lógica antes da gravação. | `apply_local_mutation_in_connection` em `apps/desktop/src-tauri/src/commands/local_finance.rs` |
| Entidade + outbox | Implementadas na mesma transação: primeiro ocorre o upsert em `entities`, depois o insert em `outbox`, e só então o commit. Um erro entre as duas gravações causa rollback das duas. | Testes `rolls_back_entity_when_failure_occurs_before_outbox_insert` e `writes_entity_and_outbox_once_and_returns_the_original_idempotent_receipt` |

Portanto, uma funcionalidade futura deve ligar seu evento React a um caso de uso da aplicação e chamar `dependencies.localFinanceStore.applyMutation(command)`. Ela não deve chamar `invoke`, abrir SQLite nem conhecer o formato das tabelas. O caso de uso não deve ser colocado dentro do adaptador: validações e regras financeiras continuam no domínio/aplicação, enquanto Rust preserva a fronteira transacional e de armazenamento.

## Garantia atômica e idempotência

O comando nativo valida e normaliza o contrato e inicia uma transação `IMMEDIATE`. A desserialização Serde valida que `baseVersion` tenha o tipo e o formato aceitos por `u64`, e `validate_command` aplica seu limite superior antes de iniciar a transação. Dentro dela, o comando consulta primeiro a `idempotencyKey`. Se a chave já existe, confirma a transação de leitura e devolve imediatamente o recibo original, sem comparar a `baseVersion` recebida no retry à versão atual da entidade. Somente para uma operação nova o comando consulta a entidade, compara `baseVersion` à versão atual, calcula a próxima versão e executa:

1. upsert da entidade em `entities`;
2. insert da operação correspondente em `outbox`;
3. commit da transação.

Não há commit entre os passos 1 e 2. Ao retornar erro antes do commit, o descarte da transação reverte as alterações. Uma repetição de `idempotencyKey` devolve o recibo persistido originalmente e não cria outra entidade ou operação de outbox.

Os campos `payload` contêm JSON dentro do banco. A proteção em repouso deste marco é do arquivo inteiro por SQLCipher; não existe uma segunda criptografia independente por coluna. A inicialização falha se `PRAGMA cipher_version` não comprovar suporte a SQLCipher, sem fallback para SQLite sem criptografia.

## Chave do banco no Windows

A chave aleatória de 32 bytes é guardada pelo backend `keyring` no **Windows Credential Manager**, identificada por:

- serviço: `Orbe`;
- conta: `local-database-key`.

Esses identificadores estão em `apps/desktop/src-tauri/src/database/key.rs`. Na primeira execução, a chave é criada com `OsRng` e codificada em hexadecimal para armazenamento no cofre. Nas execuções seguintes, o valor recuperado é decodificado novamente para os 32 bytes da chave. Ao abrir a conexão, esses bytes são codificados outra vez em hexadecimal, somente em memória, para configurar `PRAGMA key`. Os buffers transitórios controlados pela aplicação usam `Zeroizing` para limpeza automática; essa garantia não abrange cópias internas que `rusqlite` ou SQLite possam realizar. O segredo não é salvo em arquivo nem deve aparecer em logs, diagnósticos, documentação de incidente, argumentos ou comandos de terminal.

O arquivo `database-key.lock` no diretório de dados do aplicativo é somente um bloqueio de inicialização entre processos; ele não contém a chave. Seu objetivo é impedir que duas instâncias criem segredos diferentes simultaneamente.

## Banco e backups de migração

O diretório-base é obtido em runtime por `app.path().app_data_dir()` para o identificador Tauri `app.orbe.desktop` (no Windows, normalmente sob `%APPDATA%\app.orbe.desktop`). Dentro dele, a implementação usa:

```text
<app_data_dir>/
  orbe.sqlite3
  database-key.lock
  backups/
    pre-migration-<schema-alvo>-<nanos-desde-epoch-UTC>.sqlite3
```

`apps/desktop/src-tauri/src/lib.rs` define esses caminhos. Antes de aplicar uma migração pendente em um banco existente e não vazio, `EncryptedDatabase::open` inspeciona e fecha a conexão, copia os bytes do arquivo criptografado para `backups` e só então reabre o banco para migrá-lo. Bancos novos e vazios não geram uma cópia sem conteúdo.

`apps/desktop/src-tauri/src/database/migrations.rs` mantém apenas as três cópias mais novas cujo nome começa com `pre-migration-`; as mais antigas são removidas. O teste de migração também comprova que a cópia anterior é byte a byte igual ao arquivo fechado antes da mudança de esquema.

## Inspeção segura de metadados técnicos

Neste marco, a inspeção operacional do banco é **não suportada**. Não existe comando de diagnóstico nem ferramenta aprovada para recuperar a chave e abrir manualmente o arquivo. Não se deve extrair a chave do Credential Manager para usar clientes SQL ou comandos de terminal.

O suporte futuro exige um helper interno que recupere a chave diretamente pelo mesmo limite de credenciais do aplicativo, abra o banco com SQLCipher e execute somente consultas fixas de uma allowlist. As consultas abaixo são o contrato dessa implementação futura, não instruções para inspeção manual:

```sql
PRAGMA user_version;

SELECT entity_type, COUNT(*) AS entity_count,
       MIN(updated_at) AS oldest_update,
       MAX(updated_at) AS newest_update
FROM entities
GROUP BY entity_type;

SELECT entity_type, COUNT(*) AS pending_count,
       MIN(occurred_at) AS oldest_pending,
       MAX(occurred_at) AS newest_pending,
       SUM(CASE WHEN attempt_count > 0 THEN 1 ELSE 0 END) AS retried_count
FROM outbox
GROUP BY entity_type;

SELECT schema_version, applied_at
FROM schema_migrations
ORDER BY schema_version;
```

Serão aceitáveis para esse helper: versão do esquema, nomes de tabelas, tipos de entidade, versões lógicas, quantidades, contadores de tentativa, cursores e timestamps técnicos. Identificadores de operação ou entidade só deverão ser incluídos quando indispensáveis para correlação e deverão ser tratados como dados restritos.

Não executar nem registrar consultas como `SELECT *`, `SELECT payload`, dumps do banco ou serializações de comandos. Também não registrar valores, descrições, saldos, nomes de conta, categorias, instituições, dados de cartões, chave do banco ou o conteúdo de `last_error` sem uma política futura de normalização. Os testes que leem `payload` existem apenas com bancos temporários e dados fictícios; eles não constituem uma ferramenta de diagnóstico de produção.

Uma futura exportação de diagnóstico deve implementar essa lista segura no código, retornar somente agregados/metadados, oferecer pré-visualização e ter testes que provem a ausência de `payload` e de campos financeiros.
