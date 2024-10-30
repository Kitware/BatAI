function getCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return hours + minutes + seconds;
  }
function extractDateTimeComponents(dateTimeString: string) {
      const dateTime = new Date(dateTimeString);
  
      // Extracting date components
      const year = dateTime.getFullYear();
      const month = String(dateTime.getMonth() + 1).padStart(2, '0');
      const day = String(dateTime.getDate()).padStart(2, '0');
  
      // Forming date string in the format YYYY-MM-DD
      const dateString = `${year}-${month}-${day}`;
  
      // Extracting time components
      const hours = String(dateTime.getHours()).padStart(2, '0');
      const minutes = String(dateTime.getMinutes()).padStart(2, '0');
      const seconds = String(dateTime.getSeconds()).padStart(2, '0');
  
      // Forming time string in the format HHMMSS
      const timeString = `${hours}${minutes}${seconds}`;
  
      return { date: dateString, time: timeString };
  }
  
export {
    getCurrentTime,
    extractDateTimeComponents,
};
