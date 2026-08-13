import { db } from './firebase';
import { collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore';

export const fetchLatestDeedNumbers = async (targetDate: string) => {
  try {
    let targetYear = new Date().getFullYear();
    let targetMonth = new Date().getMonth() + 1;

    if (targetDate) {
      if (targetDate.includes('-')) {
        const parts = targetDate.split('-');
        if (parts.length >= 2) {
          targetYear = parseInt(parts[0]);
          targetMonth = parseInt(parts[1]);
        }
      } else if (targetDate.includes('/')) {
        const parts = targetDate.split('/');
        if (parts.length >= 3) {
          targetYear = parseInt(parts[2]);
          targetMonth = parseInt(parts[1]);
        }
      }
    }

    if (isNaN(targetYear)) targetYear = new Date().getFullYear();
    if (isNaN(targetMonth)) targetMonth = new Date().getMonth() + 1;

    const startStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const nextYear = targetMonth === 12 ? targetYear + 1 : targetYear;
    const nextMonth = targetMonth === 12 ? 1 : targetMonth + 1;
    const endStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    // Fetch ONLY documents in the target month to find maxDeedNumber
    const monthQuery = query(
      collection(db, "deeds"),
      where("date", ">=", startStr),
      where("date", "<", endStr)
    );
    const monthSnapshot = await getDocs(monthQuery);

    let maxDeedNumber = 0;
    monthSnapshot.forEach((doc) => {
      const d = doc.data();
      const deedNum = d.deedNumber || d.number;
      if (deedNum) {
        const matches = String(deedNum).match(/\d+/g);
        if (matches) {
          const docMax = Math.max(...matches.map(m => parseInt(m)));
          if (docMax > maxDeedNumber) maxDeedNumber = docMax;
        }
      }
    });

    // Fetch recent documents to find maxOrderNumber
    let maxOrderNumber = 0;
    try {
      const recentQuery = query(
        collection(db, "deeds"),
        orderBy("createdAt", "desc"),
        limit(20)
      );
      const recentSnap = await getDocs(recentQuery);
      recentSnap.forEach((doc) => {
        const d = doc.data();
        const orderNum = d.orderNumber;
        if (orderNum) {
          const matches = String(orderNum).match(/\d+/g);
          if (matches) {
            const docMax = Math.max(...matches.map(m => parseInt(m)));
            if (docMax > maxOrderNumber) maxOrderNumber = docMax;
          }
        }
      });
    } catch {
      // Fallback if orderBy createdAt index isn't ready
      const fallbackQuery = query(collection(db, "deeds"), limit(20));
      const fallbackSnap = await getDocs(fallbackQuery);
      fallbackSnap.forEach((doc) => {
        const d = doc.data();
        const orderNum = d.orderNumber;
        if (orderNum) {
          const matches = String(orderNum).match(/\d+/g);
          if (matches) {
            const docMax = Math.max(...matches.map(m => parseInt(m)));
            if (docMax > maxOrderNumber) maxOrderNumber = docMax;
          }
        }
      });
    }

    // Format results: deedNumber (2 digits), orderNumber (3 digits)
    const nextDeed = maxDeedNumber + 1;
    let nextOrder = maxOrderNumber + 1;

    // From 2025-11-01 onwards, numbering starts at 1300
    if ((targetYear > 2025 || (targetYear === 2025 && targetMonth >= 11)) && nextOrder < 1300) {
      nextOrder = 1300;
    }

    return {
      nextDeedNumber: nextDeed.toString().padStart(2, '0'),
      nextOrderNumber: nextOrder.toString().padStart(3, '0')
    };
  } catch (error) {
    console.error("Error fetching latest numbers from deeds:", error);
    throw error;
  }
};
