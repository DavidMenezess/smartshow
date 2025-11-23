# 📡 Leitor de Código de Barras USB

## Como Funciona

### ✅ **Reconhecimento Automático**

A maioria dos leitores de código de barras USB funciona como um **teclado HID (Human Interface Device)**. Isso significa:

1. **Plug and Play**: Basta conectar na porta USB
2. **Sem driver necessário**: O sistema operacional reconhece automaticamente
3. **Funciona como teclado**: Quando você escaneia um código, ele "digita" o código automaticamente

### 🔍 **Como Saber se Está Funcionando**

No sistema, você verá um indicador de status no topo do campo de código de barras:

- **📡 Aguardando leitor** (cinza) - Estado padrão, campo pronto para receber código
- **✅ Leitor detectado** (verde) - Aparece apenas quando o sistema detecta que um código foi escaneado por um leitor USB (entrada muito rápida)

**Importante**: O indicador só mostra "✅ Leitor detectado" quando realmente detecta entrada de leitor USB. Se você estiver digitando manualmente, o indicador permanece em "📡 Aguardando leitor".

### 🧪 **Teste Rápido**

1. Conecte o leitor USB na porta USB do computador
2. Abra a página do Caixa
3. Clique no campo "Código de Barras" (deve estar focado - cursor piscando)
4. Escaneie qualquer código de barras
5. O indicador deve mudar brevemente para "✅ Leitor detectado" quando o código for processado
6. O produto deve ser adicionado automaticamente ao carrinho

### ⌨️ **Digitação Manual**

Se você não tiver leitor ou quiser digitar o código manualmente:

1. Digite o código completo no campo
2. Pressione **Enter** ou clique no botão **🔍 Buscar**
3. O sistema não processará automaticamente enquanto você digita (evita erros de código incompleto)
4. O indicador permanecerá em "📡 Aguardando leitor" durante a digitação manual

### ⚙️ **Configuração do Leitor**

A maioria dos leitores vem configurada para funcionar como teclado. Se o seu leitor não funcionar:

1. **Verificar se o leitor está no modo "HID Keyboard"** (consulte o manual)
2. **Alguns leitores têm um código de configuração** - escaneie o código de configuração que vem no manual
3. **Verificar se o campo está focado** - o campo de código de barras precisa estar ativo (com cursor piscando)

### 🔧 **Troubleshooting**

#### Leitor não está funcionando:

1. **Teste em outro programa**: Abra um editor de texto (Bloco de Notas) e escaneie um código. Se aparecer texto, o leitor está funcionando.

2. **Verificar porta USB**: Tente outra porta USB

3. **Verificar foco do campo**: Certifique-se de que o campo de código de barras está ativo (clique nele)

4. **Reiniciar navegador**: Às vezes o navegador precisa ser reiniciado após conectar o leitor

#### Código escaneado não encontra produto:

- Verifique se o produto está cadastrado com esse código de barras
- Verifique se o produto está ativo (não foi excluído)
- Tente buscar o produto pelo nome para confirmar que existe

### 📝 **Notas Importantes**

- O leitor funciona melhor quando o campo de código de barras está **focado** (cursor piscando)
- O sistema detecta automaticamente se a entrada veio do leitor (entrada rápida) ou digitação manual
- Você pode usar tanto o leitor quanto digitar o código manualmente
- O sistema também permite buscar produtos pelo **nome** usando o botão "🔍 Buscar por Nome"

