import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

export const fetchLatestDeedNumbers = async (targetDate: string) => {
  try {
    const querySnapshot = await getDocs(collection(db, "deeds"));
    let maxDeedNumber = 0;
    let maxOrderNumber = 0;

    // targetDate is in YYYY-MM-DD format
    const targetParts = targetDate.split('-');
    const targetYear = parseInt(targetParts[0]);
    const targetMonth = parseInt(targetParts[1]); // 1-12

    querySnapshot.forEach((doc) => {
      const d = doc.data();
      const deedDateVal = d.deedDate || d.date;
      if (!deedDateVal) return;

      let dYear: number;
      let dMonth: number;

      if (typeof deedDateVal === 'string') {
        const parts = deedDateVal.split('-');
        if (parts.length < 2) return;
        dYear = parseInt(parts[0]);
        dMonth = parseInt(parts[1]);
      } else if (deedDateVal && typeof deedDateVal.toDate === 'function') {
        // Handle Firestore Timestamp
        const date = deedDateVal.toDate();
        dYear = date.getFullYear();
        dMonth = date.getMonth() + 1; // 1-12
      } else {
        const date = new Date(deedDateVal);
        if (isNaN(date.getTime())) return;
        dYear = date.getFullYear();
        dMonth = date.getMonth() + 1;
      }

      const deedNum = d.deedNumber || d.number;

      // For deedNumber: check same month AND same year
      if (dMonth === targetMonth && dYear === targetYear) {
        if (deedNum) {
          const matches = String(deedNum).match(/\d+/g);
          if (matches) {
            const docMax = Math.max(...matches.map(m => parseInt(m)));
            if (docMax > maxDeedNumber) maxDeedNumber = docMax;
          }
        }
      }

      // For orderNumber: check same year
      if (dYear === targetYear) {
        if (d.orderNumber) {
          const matches = String(d.orderNumber).match(/\d+/g);
          if (matches) {
            const docMax = Math.max(...matches.map(m => parseInt(m)));
            if (docMax > maxOrderNumber) maxOrderNumber = docMax;
          }
        }
      }
    });

    // Format results: deedNumber (2 digits), orderNumber (3 digits)
    const nextDeed = maxDeedNumber + 1;
    const nextOrder = maxOrderNumber + 1;

    return {
      nextDeedNumber: nextDeed.toString().padStart(2, '0'),
      nextOrderNumber: nextOrder.toString().padStart(3, '0')
    };
  } catch (error) {
    console.error("Error fetching latest numbers from deeds:", error);
    throw error;
  }
};
