# Finanças pessoais

Vocabulário do aplicativo para registrar e acompanhar as finanças privadas de cada usuário.

## Identidade do produto

**Orbe**:
Nome oficial do aplicativo desktop de finanças pessoais para Windows e do respectivo site de apresentação e download.
_Avoid_: Prumo, Cifruno, nome provisório

## Language

**Conta financeira**:
Local que representa dinheiro próprio disponível, como conta-corrente, poupança ou carteira.
_Avoid_: Cartão, fatura

**Despesa recorrente fixa**:
Compromisso que se repete mensalmente com valor conhecido e gera uma despesa pendente para confirmação.
_Avoid_: Conta variável, despesa automaticamente paga

**Lembrete recorrente variável**:
Compromisso mensal cujo valor é informado manualmente pelo usuário antes de se tornar uma despesa.
_Avoid_: Despesa fixa, lançamento automático

**Despesa pendente**:
Despesa registrada, mas ainda não confirmada como paga; não reduz o saldo da conta financeira.
_Avoid_: Despesa paga

**Despesa atrasada**:
Despesa pendente cuja data de vencimento já passou.
_Avoid_: Despesa paga, despesa cancelada

**Cartão de crédito**:
Meio de pagamento cujas compras formam faturas periódicas; não representa dinheiro disponível.
_Avoid_: Conta financeira, saldo bancário

**Fatura do cartão**:
Conjunto de compras e ajustes de um cartão dentro de um ciclo, com fechamento, vencimento e valor ainda devido.
_Avoid_: Compra, conta financeira

**Pagamento de fatura**:
Quitação total ou parcial confirmada pelo usuário, com data, valor e origem; não cria uma nova despesa.
_Avoid_: Compra, débito automático presumido

**Pagamento externo**:
Valor da fatura quitado por alguém ou por uma fonte fora das contas financeiras do usuário; não é receita e não altera seus saldos.
_Avoid_: Receita, conta fictícia, transferência

**Compra parcelada**:
Compra de valor total conhecido dividida em parcelas mensais, cada uma vinculada à fatura correspondente; diferenças de arredondamento ficam na última parcela.
_Avoid_: Despesas independentes, recorrência mensal

**Limite disponível**:
Parcela do limite total do cartão que não está comprometida por compras ainda não quitadas; é recomposta conforme pagamentos de fatura são confirmados.
_Avoid_: Saldo da conta, limite por parcela

**Orçamento de categoria**:
Limite mensal opcional definido para uma categoria de despesa; sua ausência não impede nem altera lançamentos nessa categoria.
_Avoid_: Limite obrigatório, saldo da conta

**Categoria**:
Classificação obrigatória de uma receita ou despesa, usada para organização, relatórios e orçamentos.
_Avoid_: Etiqueta, conta financeira

**Subcategoria**:
Classificação opcional pertencente diretamente a uma categoria; não pode conter outros níveis.
_Avoid_: Categoria independente, hierarquia multinível

**Conta administradora**:
Primeira conta do sistema, responsável por aprovar, recusar e bloquear outras contas de usuário, sem acesso aos dados financeiros delas.
_Avoid_: Conta financeira, proprietário dos dados de outros usuários

**Cadastro pendente**:
Conta com e-mail confirmado que aguarda aprovação da conta administradora antes do primeiro acesso.
_Avoid_: Usuário ativo, convite
