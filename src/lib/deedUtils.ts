export const fetchLatestDeedNumbers = async (targetDate: string) => {
  try {
    const res = await fetch(`/api/deeds/next-numbers?date=${encodeURIComponent(targetDate || '')}`);
    if (res.ok) {
      const data = await res.json();
      return {
        nextDeedNumber: String(data.nextDeedNumber || '01').padStart(2, '0'),
        nextOrderNumber: String(data.nextOrderNumber || '1300').padStart(3, '0')
      };
    }
  } catch (error) {
    console.error("Error fetching latest deed numbers from D1 API:", error);
  }

  // Fallback default calculation
  return {
    nextDeedNumber: '01',
    nextOrderNumber: '1300'
  };
};
