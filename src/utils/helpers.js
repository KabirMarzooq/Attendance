export const generateId = () => Math.random().toString(36).slice(2, 11);
export const getTodayDate = () => new Date().toISOString().split('T')[0];
