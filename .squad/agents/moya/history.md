# Moya — History & Learnings

## Learnings

### Add to Calendar Feature (2025)
- **Appointment data shape**: `Appointment` interface has `service`, `worker`, `date`, `start_time`, `end_time`, `location`, `notes`
- **UI patterns**: Using shadcn `DropdownMenu` components for calendar export options
- **Calendar formats**: Google Calendar uses UTC format `YYYYMMDDTHHmmssZ`, Outlook uses ISO8601, ICS uses VEVENT blocks
- **Bulk actions**: Added to the bulk action bar alongside Approve/Complete/Modify/Cancel buttons
- **Placement**: Calendar button added to both individual appointment cards and grouped pending requests
- **Implementation**: Helper functions `toGoogleCalendarUrl()`, `toOutlookUrl()`, `toICSContent()`, `downloadICS()` for different calendar formats
