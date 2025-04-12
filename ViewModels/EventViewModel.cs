// ViewModels/EventViewModel.cs
using System;
using System.ComponentModel.DataAnnotations;

namespace WeChat.ViewModels
{
    public class EventViewModel
    {
        public int EventId { get; set; }

        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        [Required(ErrorMessage = "Start time is required")]
        [Display(Name = "Start Time")]
        public DateTime StartTime { get; set; }

        [Required(ErrorMessage = "End time is required")]
        [Display(Name = "End Time")]
        public DateTime EndTime { get; set; }

        public string Location { get; set; } = string.Empty;

        [Display(Name = "All Day")]
        public bool IsAllDay { get; set; }
    }
}
