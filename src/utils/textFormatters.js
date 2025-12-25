// Force lowercase (email)
export const toLower = (value = "") =>
    value.trim().toLowerCase();
  
  // Force UPPERCASE (matric number)
  export const toUpper = (value = "") =>
    value.trim().toUpperCase();
  
  // Convert to Word Case (Title Case)
  export const toWordCase = (value = "") =>
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .split(" ")
      .map(
        (word) => word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join(" ");
  