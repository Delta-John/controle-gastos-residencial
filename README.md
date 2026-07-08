# DomusFin - Controle Financeiro Residencial

Sistema completo para gerenciamento de receitas e despesas de uma residência, com controle individual por pessoa.

---

## ✨ Funcionalidades

- **Cadastro de Pessoas**: Criação, listagem e exclusão de membros da residência.
- **Cadastro de Transações**: Lançamento de receitas e despesas vinculadas a uma pessoa.
- **Regras de Negócio**:
  - Pessoas menores de 18 anos só podem registrar **despesas**.
  - Ao excluir uma pessoa, todas as suas transações são automaticamente removidas (deleção em cascata).
- **Relatório Consolidado**: 
  - Totais individuais por pessoa (receitas, despesas e saldo).
  - Resumo geral da residência.

---

## 🛠️ Tecnologias Utilizadas

**Backend**
- ASP.NET Core Web API (.NET 8)
- Entity Framework Core
- SQLite (persistência local)

**Frontend**
- React + TypeScript
- Vite (bundler)
- CSS3 Moderno com Dark Theme e efeitos Glassmorphism

---

## 🚀 Como Rodar o Projeto

1. Backend (.NET)
```bash
cd backend
dotnet run

---

2. Iniciar o Frontend (React)
```bash
cd frontend
npm install
npm run dev
