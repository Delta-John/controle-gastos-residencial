using Microsoft.EntityFrameworkCore;
using ResidenciaFinanceira.Api.Data;
using ResidenciaFinanceira.Api.Models;

var builder = WebApplication.CreateBuilder(args);

// --- Configuração dos Serviços ---

// Configuração do CORS para permitir que o front-end React acesse os endpoints desta API
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Configuração da conexão com o banco de dados local SQLite.
// O banco de dados será persistido em um arquivo local chamado "financeiro.db".
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=financeiro.db"));

// Suporte ao OpenAPI/Swagger
builder.Services.AddOpenApi();

var app = builder.Build();

// --- Inicialização Automática do Banco de Dados ---
// Garante que o arquivo do banco de dados SQLite e suas tabelas
// sejam criados na primeira execução da aplicação.
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    // Cria o banco e as tabelas com base nas configurações e modelos do AppDbContext caso não existam
    dbContext.Database.EnsureCreated();
}

// --- Pipeline de Requisições HTTP ---

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowFrontend");
app.UseHttpsRedirection();

// --- Endpoints de Pessoas ---

// Rota para listar todas as pessoas cadastradas no sistema
app.MapGet("/api/pessoas", async (AppDbContext context) =>
{
    var pessoas = await context.Pessoas.ToListAsync();
    return Results.Ok(pessoas);
});

// Rota para cadastrar uma nova pessoa
app.MapPost("/api/pessoas", async (AppDbContext context, CriarPessoaRequest request) =>
{
    // Validação dos dados de entrada
    if (string.IsNullOrWhiteSpace(request.Nome))
    {
        return Results.BadRequest(new { Mensagem = "O nome da pessoa é obrigatório." });
    }

    if (request.Idade < 0)
    {
        return Results.BadRequest(new { Mensagem = "A idade da pessoa não pode ser negativa." });
    }

    var novaPessoa = new Pessoa
    {
        Nome = request.Nome.Trim(),
        Idade = request.Idade
    };

    context.Pessoas.Add(novaPessoa);
    await context.SaveChangesAsync();

    return Results.Created($"/api/pessoas/{novaPessoa.Id}", novaPessoa);
});

// Rota para excluir uma pessoa e todas as suas transações correspondentes (Deleção em Cascata)
app.MapDelete("/api/pessoas/{id:guid}", async (AppDbContext context, Guid id) =>
{
    var pessoa = await context.Pessoas.FindAsync(id);
    if (pessoa == null)
    {
        return Results.NotFound(new { Mensagem = "Pessoa não encontrada." });
    }

    // A remoção da pessoa aciona a deleção em cascata das suas transações, 
    // conforme configurado no método OnModelCreating da classe AppDbContext.
    context.Pessoas.Remove(pessoa);
    await context.SaveChangesAsync();

    return Results.Ok(new { Mensagem = $"Pessoa '{pessoa.Nome}' e todas as suas transações foram excluídas com sucesso." });
});

// --- Endpoints de Transações ---

// Rota para listar todas as transações cadastradas, trazendo os dados simplificados da pessoa associada
app.MapGet("/api/transacoes", async (AppDbContext context) =>
{
    var transacoes = await context.Transacoes
        .Include(t => t.Pessoa)
        .Select(t => new TransacaoResponse(
            t.Id,
            t.Descricao,
            t.Valor,
            t.Tipo,
            t.PessoaId,
            t.Pessoa != null ? t.Pessoa.Nome : "Não identificada",
            t.Data
        ))
        .ToListAsync();

    return Results.Ok(transacoes);
});

// Rota para criar uma transação com validação de regras de negócios
app.MapPost("/api/transacoes", async (AppDbContext context, CriarTransacaoRequest request) =>
{
    // Validação da existência da Pessoa
    var pessoa = await context.Pessoas.FindAsync(request.PessoaId);
    if (pessoa == null)
    {
        return Results.BadRequest(new { Mensagem = "A pessoa informada não existe no cadastro." });
    }

    // Validação do valor da transação
    if (request.Valor <= 0)
    {
        return Results.BadRequest(new { Mensagem = "O valor da transação deve ser maior que zero." });
    }

    // Padroniza a capitalização do Tipo (ex: "receita" ou "RECEITA" -> "Receita")
    var tipoFormatado = request.Tipo?.Trim();
    if (string.IsNullOrEmpty(tipoFormatado))
    {
        return Results.BadRequest(new { Mensagem = "O tipo da transação é obrigatório." });
    }

    if (tipoFormatado.Equals("receita", StringComparison.OrdinalIgnoreCase))
    {
        tipoFormatado = "Receita";
    }
    else if (tipoFormatado.Equals("despesa", StringComparison.OrdinalIgnoreCase))
    {
        tipoFormatado = "Despesa";
    }
    else
    {
        return Results.BadRequest(new { Mensagem = "Tipo inválido. Os valores válidos são 'Receita' ou 'Despesa'." });
    }

    // Regra de Negócio: Se a pessoa for menor de idade (menor de 18 anos), apenas despesas são permitidas.
    if (pessoa.Idade < 18 && tipoFormatado == "Receita")
    {
        return Results.BadRequest(new { Mensagem = $"A pessoa '{pessoa.Nome}' é menor de idade ({pessoa.Idade} anos). Para menores de 18 anos, apenas transações do tipo Despesa são permitidas." });
    }

    var novaTransacao = new Transacao
    {
        Descricao = request.Descricao.Trim(),
        Valor = request.Valor,
        Tipo = tipoFormatado,
        PessoaId = request.PessoaId,
        Data = string.IsNullOrWhiteSpace(request.Data) ? DateTime.Now.ToString("dd/MM/yyyy") : request.Data.Trim()
    };

    context.Transacoes.Add(novaTransacao);
    await context.SaveChangesAsync();

    return Results.Created($"/api/transacoes/{novaTransacao.Id}", new TransacaoResponse(
        novaTransacao.Id,
        novaTransacao.Descricao,
        novaTransacao.Valor,
        novaTransacao.Tipo,
        novaTransacao.PessoaId,
        pessoa.Nome,
        novaTransacao.Data
    ));
});

// --- Endpoint de Consulta de Totais e Relatório Consolidado ---

app.MapGet("/api/totais", async (AppDbContext context) =>
{
    var pessoas = await context.Pessoas
        .Include(p => p.Transacoes)
        .ToListAsync();

    // Mapeia os dados individuais de cada pessoa calculando os totais locais
    var totaisPessoas = pessoas.Select(p =>
    {
        var receitas = p.Transacoes.Where(t => t.Tipo == "Receita").Sum(t => t.Valor);
        var despesas = p.Transacoes.Where(t => t.Tipo == "Despesa").Sum(t => t.Valor);
        var saldo = receitas - despesas;
        var ultimaTransacao = p.Transacoes.LastOrDefault();
        var ultimaMovimentacao = ultimaTransacao != null ? ultimaTransacao.Data : "-";

        return new PessoaTotalResponse(
            p.Id,
            p.Nome,
            p.Idade,
            receitas,
            despesas,
            saldo,
            ultimaMovimentacao
        );
    }).ToList();

    // Calcula os totais agregados gerais de todas as pessoas
    var totalReceitasGeral = totaisPessoas.Sum(p => p.TotalReceitas);
    var totalDespesasGeral = totaisPessoas.Sum(p => p.TotalDespesas);
    var saldoLiquidoGeral = totalReceitasGeral - totalDespesasGeral;

    var relatorio = new RelatorioTotaisResponse(
        totaisPessoas,
        totalReceitasGeral,
        totalDespesasGeral,
        saldoLiquidoGeral
    );

    return Results.Ok(relatorio);
});

app.Run();

// --- Modelos DTO para Requisições e Respostas ---

public record CriarPessoaRequest(string Nome, int Idade);

public record CriarTransacaoRequest(string Descricao, decimal Valor, string Tipo, Guid PessoaId, string Data);

public record TransacaoResponse(Guid Id, string Descricao, decimal Valor, string Tipo, Guid PessoaId, string NomePessoa, string Data);

public record PessoaTotalResponse(Guid Id, string Nome, int Idade, decimal TotalReceitas, decimal TotalDespesas, decimal Saldo, string UltimaMovimentacao);

public record RelatorioTotaisResponse(
    List<PessoaTotalResponse> Pessoas,
    decimal TotalReceitasGeral,
    decimal TotalDespesasGeral,
    decimal SaldoLiquidoGeral
);

