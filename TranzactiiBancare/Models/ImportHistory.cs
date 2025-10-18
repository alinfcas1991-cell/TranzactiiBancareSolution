public class ImportHistory
{
    public int Id { get; set; }
    public string Sursa { get; set; } = "";
    public string UniqueKey { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.Now;
}
