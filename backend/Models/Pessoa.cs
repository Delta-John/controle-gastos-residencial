using System.Text.Json.Serialization;

namespace ResidenciaFinanceira.Api.Models;

/// <summary>
/// Representa uma pessoa cadastrada no sistema de controle de gastos residenciais.
/// </summary>
public class Pessoa
{
    /// <summary>
    /// Identificador único da pessoa. Gerado automaticamente como GUID.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Nome completo da pessoa. Campo obrigatório.
    /// </summary>
    public required string Nome { get; set; }

    /// <summary>
    /// Idade da pessoa. Usada para validação de regras de negócios (por exemplo, se é menor de 18 anos).
    /// </summary>
    public int Idade { get; set; }

    /// <summary>
    /// Coleção de transações associadas a esta pessoa. 
    /// O atributo JsonIgnore evita loops de referência ao serializar o objeto para JSON.
    /// </summary>
    [JsonIgnore]
    public ICollection<Transacao> Transacoes { get; set; } = new List<Transacao>();
}
