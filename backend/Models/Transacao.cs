namespace ResidenciaFinanceira.Api.Models;

/// <summary>
/// Representa uma transação financeira (receita ou despesa) vinculada a uma pessoa.
/// </summary>
public class Transacao
{
    /// <summary>
    /// Identificador único da transação. Gerado automaticamente como GUID.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Descrição detalhada da transação. Campo obrigatório.
    /// </summary>
    public required string Descricao { get; set; }

    /// <summary>
    /// Valor monetário da transação. Deve ser maior que zero.
    /// </summary>
    public decimal Valor { get; set; }

    /// <summary>
    /// Tipo da transação: "Receita" ou "Despesa".
    /// </summary>
    public required string Tipo { get; set; } // Valores válidos: "Receita" ou "Despesa"

    /// <summary>
    /// Data da transação no formato DD/MM/AAAA.
    /// </summary>
    public required string Data { get; set; }

    /// <summary>
    /// Chave estrangeira identificando a pessoa associada a esta transação.
    /// </summary>
    public Guid PessoaId { get; set; }

    /// <summary>
    /// Propriedade de navegação para a entidade Pessoa associada.
    /// </summary>
    public Pessoa? Pessoa { get; set; }
}
