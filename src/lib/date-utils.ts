const toDateSafe = (date: any): Date | null => {
  if (!date) return null;
  if (date instanceof Date) return date;
  if (typeof date.toDate === 'function') return date.toDate();
  
  if (typeof date._seconds === 'number' && typeof date._nanoseconds === 'number') {
    return new Date(date._seconds * 1000 + date._nanoseconds / 1000000);
  }
  if (typeof date.seconds === 'number' && typeof date.nanoseconds === 'number') {
    return new Date(date.seconds * 1000 + date.nanoseconds / 1000000);
  }

  const parsedDate = new Date(date);
  return isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export { toDateSafe };
