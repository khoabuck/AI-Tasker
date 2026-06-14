namespace AITasker.Application.DTOs.Requests
{
    public class CounterOfferRequest
    {
        public decimal CounterPrice { get; set; }

        public int CounterTimelineDays { get; set; }

        public string CounterMessage { get; set; } = string.Empty;
    }
}