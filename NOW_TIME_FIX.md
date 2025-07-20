# "Now" Time Fix Implementation

## Problem
When users selected "Now" (⚡ Now) for appointment time and navigated away from the landing page, then returned, the time would show the old "now" (e.g., a minute ago) which blocked continuing with the appointment booking.

## Solution Implemented

### 1. Landing Page (`app/page.tsx`)
Added visibility change handlers to update "Now" time when page becomes visible:

```javascript
// Handle visibility change for "Now" time updates
const handleTimeVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    // Check if time was set to "ASAP" (Now)
    if (formData.appointmentTime === "ASAP") {
      console.log('🕐 Updating "Now" time to current time');
      setFormData(prev => ({
        ...prev,
        appointmentTime: "ASAP" // Keep as ASAP, but this will trigger time slot regeneration
      }));
    }
  }
};
```

### 2. DateTime Selector (`components/date-time-selector.tsx`)
Added visibility change handler to refresh time slots when page becomes visible:

```javascript
// Handle visibility change to refresh "Now" time when page becomes visible
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && isToday(selectedDate) && selectedTime === "ASAP") {
      console.log('🕐 Refreshing "Now" time slots when page becomes visible');
      // Force regeneration of time slots to update the "Now" time
      const { index } = getNextTimeSlot();
      const futureTimeSlots = allTimeSlots.slice(index);
      const todayTimeSlots = ["ASAP", ...futureTimeSlots];
      setAvailableTimeSlots(todayTimeSlots);
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleVisibilityChange);
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleVisibilityChange);
  };
}, [selectedDate, selectedTime, allTimeSlots]);
```

### 3. Helper Functions
Added utility functions for time validation:

```javascript
// Helper function to check if time is "Now" (ASAP)
const isNowTime = useCallback((time: string) => {
  return time === "ASAP" || time === "now" || time === "⚡ Now";
}, []);

// Validation function to prevent past times
const validateTime = useCallback(() => {
  if (formData.appointmentTime && !isNowTime(formData.appointmentTime)) {
    const selectedTime = new Date();
    const [hours, minutes] = formData.appointmentTime.split(':').map(Number);
    selectedTime.setHours(hours, minutes, 0, 0);
    const now = new Date();
    
    if (selectedTime < now) {
      setErrors(prev => ({ ...prev, appointmentTime: 'Please select a future time' }));
      return false;
    }
  }
  return true;
}, [formData.appointmentTime, isNowTime]);
```

## How It Works

1. **Page Visibility Detection**: When the user returns to the page, the `visibilitychange` and `focus` events trigger
2. **Time Refresh**: If the selected time is "ASAP" (Now), the system refreshes the time slots to reflect the current time
3. **Validation**: Added validation to prevent users from selecting past times
4. **Display**: The DateTimeSelector already properly displays "⚡ Now" for ASAP times

## Benefits

- ✅ "Now" time always reflects current time when returning to page
- ✅ Prevents users from getting stuck with old "now" times
- ✅ Maintains existing validation logic for future appointments
- ✅ No breaking changes to existing functionality
- ✅ Works with both visibility change and focus events for maximum compatibility

## Testing

To test the fix:
1. Select "⚡ Now" for appointment time
2. Navigate away from the page (open new tab, switch apps, etc.)
3. Return to the page after a few minutes
4. Verify that the time still shows "⚡ Now" and allows continuing
5. Check browser console for "🕐 Updating 'Now' time" log messages 