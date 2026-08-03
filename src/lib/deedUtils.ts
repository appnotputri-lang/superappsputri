import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

export const fetchLatestDeedNumbers = async (targetDate: string) => {
  try {
    const querySnapshot = await getDocs(collection(db, "deeds"));
    let maxDeedNumber = 0;
    let maxOrderNumber = 0;

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

    querySnapshot.forEach((doc) => {
      const d = doc.data();
      const deedDateVal = d.deedDate || d.date;
      if (!deedDateVal) return;

      let dYear: number | null = null;
      let dMonth: number | null = null;

      if (typeof deedDateVal === 'string') {
        if (deedDateVal.includes('-')) {
          const parts = deedDateVal.split('-');
          if (parts.length >= 2) {
            dYear = parseInt(parts[0]);
            dMonth = parseInt(parts[1]);
          }
        } else if (deedDateVal.includes('/')) {
          const parts = deedDateVal.split('/');
          if (parts.length >= 3) {
            dYear = parseInt(parts[2]);
            dMonth = parseInt(parts[1]);
          }
        }
        if (dYear === null || isNaN(dYear)) {
          const dt = new Date(deedDateVal);
          if (!isNaN(dt.getTime())) {
            dYear = dt.getFullYear();
            dMonth = dt.getMonth() + 1;
          }
        }
      } else if (deedDateVal && typeof deedDateVal.toDate === 'function') {
        const dt = deedDateVal.toDate();
        dYear = dt.getFullYear();
        dMonth = dt.getMonth() + 1;
      } else {
        const dt = new Date(deedDateVal);
        if (!isNaN(dt.getTime())) {
          dYear = dt.getFullYear();
          dMonth = dt.getMonth() + 1;
        }
      }

      if (dYear === null || dMonth === null || isNaN(dYear) || isNaN(dMonth)) return;

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
        const orderNum = d.orderNumber;
        if (orderNum) {
          const matches = String(orderNum).match(/\d+/g);
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
