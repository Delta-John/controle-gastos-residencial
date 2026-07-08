using Microsoft.EntityFrameworkCore;
using ResidenciaFinanceira.Api.Models;

namespace ResidenciaFinanceira.Api.Data;

/// <summary>
/// Contexto do banco de dados para a aplicação de Controle de Gastos Residenciais.
/// Configura o mapeamento das entidades e o relacionamento entre elas usando o Entity Framework Core.
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    /// <summary>
    /// Tabela correspondente ao cadastro de Pessoas.
    /// </summary>
    public DbSet<Pessoa> Pessoas => Set<Pessoa>();

    /// <summary>
    /// Tabela correspondente ao histórico de Transações.
    /// </summary>
    public DbSet<Transacao> Transacoes => Set<Transacao>();

    /// <summary>
    /// Configura regras de modelagem no banco de dados, como chaves primárias,
    /// restrições e o relacionamento com deleção em cascata.
    /// </summary>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Mapeamento da entidade Pessoa
        modelBuilder.Entity<Pessoa>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Nome).IsRequired().HasMaxLength(150);
            entity.Property(p => p.Idade).IsRequired();
        });

        // Mapeamento da entidade Transacao
        modelBuilder.Entity<Transacao>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Descricao).IsRequired().HasMaxLength(250);
            entity.Property(t => t.Valor).IsRequired().HasPrecision(18, 2);
            entity.Property(t => t.Tipo).IsRequired().HasMaxLength(20);

            // Configuração do relacionamento de 1 Pessoa para N Transações.
            // A deleção em cascata (DeleteBehavior.Cascade) garante que se uma pessoa for excluída,
            // todas as transações pertencentes a ela serão automaticamente apagadas do banco.
            entity.HasOne(t => t.Pessoa)
                  .WithMany(p => p.Transacoes)
                  .HasForeignKey(t => t.PessoaId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
